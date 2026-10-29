const express = require('express'), crypto = require('node:crypto'), bcrypt = require('bcryptjs');
const { consulta, um, transacao } = require('../config/db');
const { erro, auditar, senhaValida, emailValido } = require('../utils');
const { limitar } = require('../middlewares/seguranca');
const emailService = require('../services/email');

const publicas = express.Router();   // não exigem login
const privadas = express.Router();   // exigem login

// Solicita ingresso em uma instituição (fica pendente até o administrador aprovar).
publicas.post('/registrar', limitar(10, 900000), async (req, res, next) => {
  try {
    const { nome, email, senha, instituicao, papel } = req.body || {};
    if (!emailValido(email)) return erro(res, 'Informe um endereço de e-mail válido.');
    if (!nome?.trim() || !senhaValida(senha) || !['aluno', 'orientador', 'avaliador'].includes(papel)) return erro(res, 'Dados inválidos (senha com 8 a 72 caracteres)');
    const emailNormalizado = email.trim().toLowerCase();
    const inst = await um("SELECT id FROM instituicoes WHERE identificador=$1 AND status='ativa'", [String(instituicao || '').toLowerCase()]);
    if (!inst) return erro(res, 'Instituição não encontrada');
    let usuario = await um('SELECT * FROM usuarios WHERE email=$1', [emailNormalizado]);
    if (usuario) {
      if (!(await bcrypt.compare(senha, usuario.hash))) return erro(res, 'E-mail já cadastrado: informe a senha da conta existente', 401);
    } else {
      if (!emailService.configurado()) return erro(res, 'Cadastro temporariamente indisponível: serviço de e-mail não configurado.', 503);
      usuario = await um('INSERT INTO usuarios (nome, email, hash, email_verificado) VALUES ($1,$2,$3,FALSE) RETURNING id',
        [nome.trim(), emailNormalizado, await bcrypt.hash(senha, 12)]);
    }
    if (!usuario.email_verificado && !emailService.configurado()) return erro(res, 'Confirmação de e-mail temporariamente indisponível: serviço de e-mail não configurado.', 503);
    await consulta('INSERT INTO vinculos (usuario_id, instituicao_id, papel) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [usuario.id, inst.id, papel]);
    if (!usuario.email_verificado) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashToken = crypto.createHash('sha256').update(token).digest('hex');
      await consulta('DELETE FROM tokens_verificacao_email WHERE usuario_id=$1', [usuario.id]);
      await consulta(`INSERT INTO tokens_verificacao_email (usuario_id, token_hash, expira_em)
        VALUES ($1,$2,now() + interval '24 hours')`, [usuario.id, hashToken]);
      try {
        await emailService.enviarConfirmacao(emailNormalizado, token);
      } catch (err) {
        await consulta('DELETE FROM tokens_verificacao_email WHERE token_hash=$1', [hashToken]);
        console.error('Falha ao enviar confirmação de e-mail:', err.message);
        return erro(res, 'Cadastro criado, mas não foi possível enviar a confirmação. Tente solicitar acesso novamente mais tarde.', 503);
      }
      return res.status(201).json({ mensagem: 'Solicitação enviada. Confirme seu e-mail pelo link enviado e aguarde a aprovação do administrador.' });
    }
    res.status(201).json({ mensagem: 'Solicitação enviada. Aguarde a aprovação do administrador.' });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO REGISTAR ---', err);
    next(err);
  }
});

publicas.post('/login', limitar(10, 900000), async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};
    const u = await um('SELECT * FROM usuarios WHERE email=$1', [String(email || '').trim().toLowerCase()]);
    if (!u || u.status !== 'ativo' || !(await bcrypt.compare(String(senha || ''), u.hash))) {
      return erro(res, 'Credenciais inválidas', 401);
    }
    if (!u.email_verificado) return erro(res, 'Confirme seu e-mail pelo link enviado ao solicitar acesso.', 403);
    const v = await um(`SELECT v.instituicao_id FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
      WHERE v.usuario_id=$1 AND v.situacao='aprovado' AND i.status='ativa' ORDER BY v.instituicao_id LIMIT 1`, [u.id]);
    if (!v && !u.superadmin) {
      return erro(res, 'Acesso indisponível: cadastro pendente, recusado ou bloqueado', 403);
    }
    const token = crypto.randomBytes(32).toString('hex');
    await consulta('INSERT INTO sessoes (token, usuario_id, instituicao_id) VALUES ($1,$2,$3)', [token, u.id, v?.instituicao_id ?? null]);
    
    // Configura SameSite=None e Secure para aceitar cookies entre Vercel e Render
    const isProd = process.env.NODE_ENV === 'production';
    const sameSiteSecure = isProd ? '; SameSite=None; Secure' : '; SameSite=Lax';

    res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; Path=/; Max-Age=28800${sameSiteSecure}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO LOGIN ---', err);
    next(err);
  }
});

publicas.post('/esqueci-senha', limitar(5, 900000), async (req, res, next) => {
  try {
    const endereco = req.body?.email;
    if (!emailValido(endereco)) return erro(res, 'Informe um endereço de e-mail válido.');
    if (!emailService.configurado()) return erro(res, 'Recuperação temporariamente indisponível: serviço de e-mail não configurado.', 503);

    const usuario = await um('SELECT id FROM usuarios WHERE email=$1', [endereco.trim().toLowerCase()]);
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashToken = crypto.createHash('sha256').update(token).digest('hex');
      await consulta('DELETE FROM tokens_recuperacao WHERE usuario_id=$1', [usuario.id]);
      await consulta(`INSERT INTO tokens_recuperacao (usuario_id, token_hash, expira_em)
        VALUES ($1,$2,now() + interval '1 hour')`, [usuario.id, hashToken]);
      try {
        await emailService.enviarRecuperacao(endereco.trim(), token);
      } catch (err) {
        await consulta('DELETE FROM tokens_recuperacao WHERE token_hash=$1', [hashToken]);
        console.error('Falha ao enviar e-mail de recuperação:', err.message);
        return erro(res, 'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.', 503);
      }
    }

    res.json({ mensagem: 'Se houver uma conta com esse e-mail, você receberá instruções para redefinir a senha.' });
  } catch (err) {
    console.error('Erro ao solicitar recuperação de senha:', err.message || err);
    next(err);
  }
});

publicas.post('/confirmar-email', limitar(10, 900000), async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return erro(res, 'Link de confirmação inválido ou expirado.');

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const confirmado = await transacao(async c => {
      const { rows: [registro] } = await c.query(`SELECT usuario_id FROM tokens_verificacao_email
        WHERE token_hash=$1 AND usado_em IS NULL AND expira_em > now() FOR UPDATE`, [hashToken]);
      if (!registro) return false;

      await c.query('UPDATE usuarios SET email_verificado=TRUE WHERE id=$1', [registro.usuario_id]);
      await c.query('DELETE FROM tokens_verificacao_email WHERE usuario_id=$1', [registro.usuario_id]);
      return true;
    });

    if (!confirmado) return erro(res, 'Link de confirmação inválido ou expirado. Solicite acesso novamente.', 400);
    res.json({ mensagem: 'E-mail confirmado com sucesso. Você poderá entrar após a aprovação da instituição.' });
  } catch (err) {
    console.error('Erro ao confirmar e-mail:', err.message || err);
    next(err);
  }
});

publicas.post('/redefinir-senha', limitar(10, 900000), async (req, res, next) => {
  try {
    const { token, senha } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !senhaValida(senha)) {
      return erro(res, 'Link inválido ou expirado, ou senha fora do padrão (8 a 72 caracteres).');
    }

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const redefinido = await transacao(async c => {
      const { rows: [registro] } = await c.query(`SELECT usuario_id FROM tokens_recuperacao
        WHERE token_hash=$1 AND usado_em IS NULL AND expira_em > now() FOR UPDATE`, [hashToken]);
      if (!registro) return false;

      await c.query('UPDATE usuarios SET hash=$1 WHERE id=$2', [await bcrypt.hash(senha, 12), registro.usuario_id]);
      await c.query('DELETE FROM sessoes WHERE usuario_id=$1', [registro.usuario_id]);
      await c.query('DELETE FROM tokens_recuperacao WHERE usuario_id=$1', [registro.usuario_id]);
      return true;
    });

    if (!redefinido) return erro(res, 'Link inválido ou expirado. Solicite uma nova recuperação.', 400);
    res.json({ mensagem: 'Senha redefinida com sucesso. Entre com sua nova senha.' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err.message || err);
    next(err);
  }
});

privadas.post('/logout', async (req, res, next) => {
  try {
    await consulta('DELETE FROM sessoes WHERE token=$1', [req.u.token]);
    
    const isProd = process.env.NODE_ENV === 'production';
    const sameSiteSecure = isProd ? '; SameSite=None; Secure' : '; SameSite=Lax';

    res.setHeader('Set-Cookie', `sid=; HttpOnly; Path=/; Max-Age=0${sameSiteSecure}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO LOGOUT ---', err);
    next(err);
  }
});

privadas.get('/eu', async (req, res, next) => {
  try {
    const inst = req.u.inst ? await um('SELECT nome AS "instNome", cor FROM instituicoes WHERE id=$1', [req.u.inst]) : {};
    const instituicoes = await consulta(`SELECT i.id, i.nome FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
      WHERE v.usuario_id=$1 AND v.situacao='aprovado' AND i.status='ativa' GROUP BY i.id, i.nome ORDER BY i.nome`, [req.u.id]);
    res.json({ id: req.u.id, nome: req.u.nome, super: req.u.super, inst: req.u.inst, papeis: req.u.papeis, ...inst, instituicoes });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO /EU ---', err);
    next(err);
  }
});

// Usuário em mais de uma instituição troca a instituição ativa.
privadas.post('/trocar', async (req, res, next) => {
  try {
    const id = Number(req.body?.instituicao_id) || 0;
    const ok = await um(`SELECT 1 FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
      WHERE v.usuario_id=$1 AND v.instituicao_id=$2 AND v.situacao='aprovado' AND i.status='ativa'`, [req.u.id, id]);
    if (!ok) return erro(res, 'Instituição não permitida', 403);
    await consulta('UPDATE sessoes SET instituicao_id=$1 WHERE token=$2', [id, req.u.token]);
    res.json({ ok: true });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO TROCAR ---', err);
    next(err);
  }
});

privadas.post('/senha', async (req, res, next) => {
  try {
    const { atual, nova } = req.body || {};
    const u = await um('SELECT hash FROM usuarios WHERE id=$1', [req.u.id]);
    if (!senhaValida(nova) || !(await bcrypt.compare(String(atual || ''), u.hash))) {
      return erro(res, 'Senha atual incorreta ou nova senha inválida (8 a 72 caracteres)');
    }
    await consulta('UPDATE usuarios SET hash=$1 WHERE id=$2', [await bcrypt.hash(nova, 12), req.u.id]);
    await consulta('DELETE FROM sessoes WHERE usuario_id=$1 AND token<>$2', [req.u.id, req.u.token]);
    await auditar(req, 'senha.alterar', 'usuario', req.u.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('--- ERRO DETALHADO NO ALTERAR SENHA ---', err);
    next(err);
  }
});

module.exports = { publicas, privadas };