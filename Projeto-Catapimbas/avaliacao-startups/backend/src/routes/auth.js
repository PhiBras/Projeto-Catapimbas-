const express = require('express'), crypto = require('node:crypto'), bcrypt = require('bcryptjs');
const { consulta, um } = require('../config/db');
const { erro, auditar, senhaValida, emailValido } = require('../utils');
const { limitar } = require('../middlewares/seguranca');

const publicas = express.Router();   // não exigem login
const privadas = express.Router();   // exigem login

// Solicita ingresso em uma instituição (fica pendente até o administrador aprovar).
publicas.post('/registrar', limitar(10, 900000), async (req, res) => {
  const { nome, email, senha, instituicao, papel } = req.body || {};
  if (!nome?.trim() || !emailValido(email) || !senhaValida(senha) || !['aluno', 'orientador', 'avaliador'].includes(papel))
    return erro(res, 'Dados inválidos (senha com 8 a 72 caracteres)');
  const inst = await um("SELECT id FROM instituicoes WHERE identificador=$1 AND status='ativa'", [String(instituicao || '').toLowerCase()]);
  if (!inst) return erro(res, 'Instituição não encontrada');
  let usuario = await um('SELECT * FROM usuarios WHERE email=$1', [email.toLowerCase()]);
  if (usuario) {
    if (!(await bcrypt.compare(senha, usuario.hash))) return erro(res, 'E-mail já cadastrado: informe a senha da conta existente', 401);
  } else {
    usuario = await um('INSERT INTO usuarios (nome, email, hash) VALUES ($1,$2,$3) RETURNING id',
      [nome.trim(), email.toLowerCase(), await bcrypt.hash(senha, 12)]);
  }
  await consulta('INSERT INTO vinculos (usuario_id, instituicao_id, papel) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [usuario.id, inst.id, papel]);
  res.status(201).json({ mensagem: 'Solicitação enviada. Aguarde a aprovação do administrador.' });
});

publicas.post('/login', limitar(10, 900000), async (req, res) => {
  const { email, senha } = req.body || {};
  const u = await um('SELECT * FROM usuarios WHERE email=$1', [String(email || '').toLowerCase()]);
  if (!u || u.status !== 'ativo' || !(await bcrypt.compare(String(senha || ''), u.hash))) return erro(res, 'Credenciais inválidas', 401);
  const v = await um(`SELECT v.instituicao_id FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
    WHERE v.usuario_id=$1 AND v.situacao='aprovado' AND i.status='ativa' ORDER BY v.instituicao_id LIMIT 1`, [u.id]);
  if (!v && !u.superadmin) return erro(res, 'Acesso indisponível: cadastro pendente, recusado ou bloqueado', 403);
  consulta("DELETE FROM sessoes WHERE criada < now() - interval '8 hours'").catch(() => {});   // limpa sessões vencidas
  const token = crypto.randomBytes(32).toString('hex');
  await consulta('INSERT INTO sessoes (token, usuario_id, instituicao_id) VALUES ($1,$2,$3)', [token, u.id, v?.instituicao_id ?? null]);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`);
  res.json({ ok: true });
});

privadas.post('/logout', async (req, res) => {
  await consulta('DELETE FROM sessoes WHERE token=$1', [req.u.token]);
  res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/');
  res.json({ ok: true });
});

privadas.get('/eu', async (req, res) => {
  const inst = req.u.inst ? await um('SELECT nome AS "instNome", cor FROM instituicoes WHERE id=$1', [req.u.inst]) : {};
  const instituicoes = await consulta(`SELECT i.id, i.nome FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
    WHERE v.usuario_id=$1 AND v.situacao='aprovado' AND i.status='ativa' GROUP BY i.id, i.nome ORDER BY i.nome`, [req.u.id]);
  res.json({ id: req.u.id, nome: req.u.nome, super: req.u.super, inst: req.u.inst, papeis: req.u.papeis, ...inst, instituicoes });
});

// Usuário em mais de uma instituição troca a instituição ativa.
privadas.post('/trocar', async (req, res) => {
  const id = Number(req.body?.instituicao_id) || 0;
  const ok = await um(`SELECT 1 FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
    WHERE v.usuario_id=$1 AND v.instituicao_id=$2 AND v.situacao='aprovado' AND i.status='ativa'`, [req.u.id, id]);
  if (!ok) return erro(res, 'Instituição não permitida', 403);
  await consulta('UPDATE sessoes SET instituicao_id=$1 WHERE token=$2', [id, req.u.token]);
  res.json({ ok: true });
});

privadas.post('/senha', async (req, res) => {
  const { atual, nova } = req.body || {};
  const u = await um('SELECT hash FROM usuarios WHERE id=$1', [req.u.id]);
  if (!senhaValida(nova) || !(await bcrypt.compare(String(atual || ''), u.hash)))
    return erro(res, 'Senha atual incorreta ou nova senha inválida (8 a 72 caracteres)');
  await consulta('UPDATE usuarios SET hash=$1 WHERE id=$2', [await bcrypt.hash(nova, 12), req.u.id]);
  await consulta('DELETE FROM sessoes WHERE usuario_id=$1 AND token<>$2', [req.u.id, req.u.token]);
  await auditar(req, 'senha.alterar', 'usuario', req.u.id);
  res.json({ ok: true });
});

module.exports = { publicas, privadas };
