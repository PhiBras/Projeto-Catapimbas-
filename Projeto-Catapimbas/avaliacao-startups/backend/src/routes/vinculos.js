// Pessoas da instituição: aprovação, bloqueio e redefinição de senha (administrador).
const express = require('express'), bcrypt = require('bcryptjs');
const { consulta, um } = require('../config/db');
const { exige } = require('../middlewares/auth');
const { erro, auditar, senhaValida } = require('../utils');
const router = express.Router();

router.get('/vinculos', exige('admin'), async (req, res) => res.json(await consulta(`
  SELECT v.id, u.nome, u.email, v.papel, v.situacao, v.justificativa
  FROM vinculos v JOIN usuarios u ON u.id = v.usuario_id
  WHERE v.instituicao_id = $1 ORDER BY (v.situacao = 'pendente') DESC, u.nome`, [req.u.inst])));

router.post('/vinculos/:id/situacao', exige('admin'), async (req, res) => {
  const { situacao, justificativa } = req.body || {};
  if (!['aprovado', 'recusado', 'bloqueado'].includes(situacao)) return erro(res, 'Situação inválida');
  if (situacao !== 'aprovado' && !justificativa?.trim()) return erro(res, 'Justificativa obrigatória');
  const v = await um('SELECT * FROM vinculos WHERE id=$1 AND instituicao_id=$2', [Number(req.params.id) || 0, req.u.inst]);
  if (!v) return erro(res, 'Não encontrado', 404);
  if (v.usuario_id === req.u.id) return erro(res, 'Não é possível alterar o próprio vínculo', 409);
  await consulta('UPDATE vinculos SET situacao=$1, justificativa=$2 WHERE id=$3', [situacao, justificativa?.trim() || null, v.id]);
  await auditar(req, 'vinculo.' + situacao, 'vinculo', v.id, { de: v.situacao, justificativa });
  res.json({ ok: true });
});

// Redefinição feita pelo administrador (não depende de e-mail).
router.post('/vinculos/:id/senha', exige('admin'), async (req, res) => {
  const v = await um(`SELECT v.usuario_id, u.superadmin FROM vinculos v JOIN usuarios u ON u.id = v.usuario_id
    WHERE v.id=$1 AND v.instituicao_id=$2`, [Number(req.params.id) || 0, req.u.inst]);
  if (!v) return erro(res, 'Não encontrado', 404);
  const outra = await um('SELECT 1 FROM vinculos WHERE usuario_id=$1 AND instituicao_id<>$2', [v.usuario_id, req.u.inst]);
  if (v.superadmin || outra) return erro(res, 'Usuário pertence a mais de uma instituição: ele deve alterar a própria senha', 409);
  if (!senhaValida(req.body?.senha)) return erro(res, 'Senha inválida (8 a 72 caracteres)');
  await consulta('UPDATE usuarios SET hash=$1 WHERE id=$2', [await bcrypt.hash(req.body.senha, 12), v.usuario_id]);
  await consulta('DELETE FROM sessoes WHERE usuario_id=$1', [v.usuario_id]);
  await auditar(req, 'senha.redefinir', 'usuario', v.usuario_id);
  res.json({ ok: true });
});

// Lista de pessoas aprovadas (usada nos formulários de projeto e banca).
router.get('/pessoas', exige('admin', 'coordenador', 'orientador'), async (req, res) => res.json(await consulta(`
  SELECT u.id, u.nome, STRING_AGG(v.papel, ',') AS papeis
  FROM vinculos v JOIN usuarios u ON u.id = v.usuario_id
  WHERE v.instituicao_id = $1 AND v.situacao = 'aprovado'
  GROUP BY u.id, u.nome ORDER BY u.nome`, [req.u.inst])));

module.exports = router;
