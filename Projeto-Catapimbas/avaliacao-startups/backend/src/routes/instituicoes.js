// Somente o superadministrador acessa estas rotas.
const express = require('express'), bcrypt = require('bcryptjs');
const { consulta, transacao } = require('../config/db');
const { erro, auditar, senhaValida, emailValido } = require('../utils');
const router = express.Router();

router.get('/', async (req, res) => res.json(await consulta('SELECT * FROM instituicoes ORDER BY id')));

router.post('/', async (req, res) => {
  const { nome, identificador, cor, admin } = req.body || {};
  if (!nome?.trim() || !/^[a-z0-9-]{3,30}$/.test(identificador || '')) return erro(res, 'Nome e identificador (a-z, 0-9, hífen; 3 a 30) obrigatórios');
  if (admin && (!admin.nome?.trim() || !emailValido(admin.email) || !senhaValida(admin.senha))) return erro(res, 'Dados do administrador inválidos');
  const hash = admin ? await bcrypt.hash(admin.senha, 12) : null;
  const id = await transacao(async c => {
    const { rows: [i] } = await c.query('INSERT INTO instituicoes (nome, identificador, cor) VALUES ($1,$2,$3) RETURNING id',
      [nome.trim(), identificador, /^#[0-9a-f]{6}$/i.test(cor || '') ? cor : '#2563eb']);
    if (admin) {
      let { rows: [u] } = await c.query('SELECT id FROM usuarios WHERE email=$1', [admin.email.toLowerCase()]);
      if (!u) ({ rows: [u] } = await c.query('INSERT INTO usuarios (nome, email, hash) VALUES ($1,$2,$3) RETURNING id', [admin.nome.trim(), admin.email.toLowerCase(), hash]));
      await c.query("INSERT INTO vinculos (usuario_id, instituicao_id, papel, situacao) VALUES ($1,$2,'admin','aprovado')", [u.id, i.id]);
    }
    return i.id;
  });
  await auditar(req, 'instituicao.criar', 'instituicao', id);
  res.status(201).json({ id });
});

router.patch('/:id/status', async (req, res) => {
  if (!['ativa', 'suspensa'].includes(req.body?.status)) return erro(res, 'Status inválido');
  const r = await consulta('UPDATE instituicoes SET status=$1 WHERE id=$2 RETURNING id', [req.body.status, Number(req.params.id) || 0]);
  if (!r.length) return erro(res, 'Não encontrada', 404);
  await auditar(req, 'instituicao.status', 'instituicao', r[0].id, { status: req.body.status });
  res.json({ ok: true });
});

module.exports = router;
