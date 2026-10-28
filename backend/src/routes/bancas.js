const express = require('express');
const { consulta, um, transacao } = require('../config/db');
const { exige } = require('../middlewares/auth');
const { erro, ehGestor, auditar, temPapel } = require('../utils');
const { calcularRanking } = require('../services/ranking');
const router = express.Router();

// Busca a banca SOMENTE se for da instituição ativa (senão responde 404).
const bancaDaInstituicao = (req, id) => um('SELECT * FROM bancas WHERE id=$1 AND instituicao_id=$2', [Number(id) || 0, req.u.inst]);

router.get('/bancas', async (req, res) => {
  // gestores veem todas; os demais só as publicadas ou aquelas em que foram designados como avaliadores
  const bancas = await consulta(`SELECT id, nome, status, publicada FROM bancas WHERE instituicao_id=$1
    AND ($2 OR publicada OR id IN (SELECT banca_id FROM banca_avaliadores WHERE usuario_id=$3)) ORDER BY id DESC`, [req.u.inst, ehGestor(req), req.u.id]);
  for (const b of bancas) {
    b.criterios = await consulta('SELECT id, titulo, peso, descritores FROM criterios WHERE banca_id=$1 ORDER BY id', [b.id]);
    b.projetos = await consulta(`SELECT p.id, p.nome FROM banca_projetos bp JOIN projetos p ON p.id = bp.projeto_id
      WHERE bp.banca_id=$1 AND NOT p.excluido ORDER BY p.nome`, [b.id]);
    b.designado = !!(await um('SELECT 1 FROM banca_avaliadores WHERE banca_id=$1 AND usuario_id=$2', [b.id, req.u.id]));
    b.minhas = (await consulta('SELECT DISTINCT projeto_id FROM avaliacoes WHERE banca_id=$1 AND avaliador_id=$2', [b.id, req.u.id])).map(r => r.projeto_id);
  }
  res.json(bancas);
});

// Detalhes completos de uma banca específica
router.get('/bancas/:id', async (req, res) => {
  const b = await bancaDaInstituicao(req, req.params.id);
  if (!b) return erro(res, 'Banca não encontrada', 404);
  b.criterios = await consulta('SELECT id, titulo, peso, descritores FROM criterios WHERE banca_id=$1 ORDER BY id', [b.id]);
  b.projetos = await consulta(`SELECT p.id, p.nome FROM banca_projetos bp JOIN projetos p ON p.id = bp.projeto_id WHERE bp.banca_id=$1 AND NOT p.excluido ORDER BY p.nome`, [b.id]);
  b.avaliadores = (await consulta('SELECT usuario_id FROM banca_avaliadores WHERE banca_id=$1', [b.id])).map(r => r.usuario_id);
  res.json(b);
});

router.post('/bancas', exige('admin', 'coordenador'), async (req, res) => {
  const { nome, criterios, projetos, avaliadores } = req.body || {};
  const ps = (projetos || []).map(Number), avs = (avaliadores || []).map(Number);
  if (!nome?.trim() || !Array.isArray(criterios) || !criterios.length || !ps.length || !avs.length) return erro(res, 'Informe nome, critérios, projetos e avaliadores');
  if (criterios.some(c => !c.titulo?.trim() || !(Number(c.peso) > 0 && Number(c.peso) <= 10))) return erro(res, 'Critério inválido (peso entre 0 e 10)');
  for (const p of ps) if (!(await um('SELECT 1 FROM projetos WHERE id=$1 AND instituicao_id=$2 AND NOT excluido', [p, req.u.inst]))) return erro(res, 'Projeto inválido para esta instituição');
  for (const a of avs) if (!(await temPapel(a, req.u.inst, 'avaliador'))) return erro(res, 'Avaliador inválido para esta instituição');
  const id = await transacao(async c => {
    const { rows: [b] } = await c.query('INSERT INTO bancas (instituicao_id, nome) VALUES ($1,$2) RETURNING id', [req.u.inst, nome.trim()]);
    for (const k of criterios) await c.query('INSERT INTO criterios (banca_id, titulo, peso, descritores) VALUES ($1,$2,$3,$4)', [b.id, k.titulo.trim(), Number(k.peso), JSON.stringify(k.descritores || {})]);
    for (const p of ps) await c.query('INSERT INTO banca_projetos (banca_id, projeto_id) VALUES ($1,$2)', [b.id, p]);
    for (const a of avs) await c.query('INSERT INTO banca_avaliadores (banca_id, usuario_id) VALUES ($1,$2)', [b.id, a]);
    return b.id;
  });
  await auditar(req, 'banca.criar', 'banca', id);
  res.status(201).json({ id });
});

// Edição de Banca existente
router.put('/bancas/:id', exige('admin', 'coordenador'), async (req, res) => {
  const b = await bancaDaInstituicao(req, req.params.id);
  if (!b) return erro(res, 'Banca não encontrada', 404);
  if (b.publicada || b.status === 'encerrada') return erro(res, 'Bancas encerradas ou publicadas não podem ser editadas', 409);
  if (await um('SELECT 1 FROM avaliacoes WHERE banca_id=$1 LIMIT 1', [b.id])) {
    return erro(res, 'Banca já possui avaliações lançadas e não pode ser editada', 409);
  }

  const { nome, criterios, projetos, avaliadores } = req.body || {};
  const ps = (projetos || []).map(Number), avs = (avaliadores || []).map(Number);

  if (!nome?.trim() || !Array.isArray(criterios) || !criterios.length || !ps.length || !avs.length) {
    return erro(res, 'Informe nome, critérios, projetos e avaliadores');
  }
  if (criterios.some(c => !c.titulo?.trim() || !(Number(c.peso) > 0 && Number(c.peso) <= 10))) {
    return erro(res, 'Critério inválido (peso entre 0 e 10)');
  }

  for (const p of ps) {
    if (!(await um('SELECT 1 FROM projetos WHERE id=$1 AND instituicao_id=$2 AND NOT excluido', [p, req.u.inst]))) {
      return erro(res, 'Projeto inválido para esta instituição');
    }
  }
  for (const a of avs) {
    if (!(await temPapel(a, req.u.inst, 'avaliador'))) {
      return erro(res, 'Avaliador inválido para esta instituição');
    }
  }

  await transacao(async c => {
    await c.query('UPDATE bancas SET nome=$1 WHERE id=$2', [nome.trim(), b.id]);
    await c.query('DELETE FROM banca_projetos WHERE banca_id=$1', [b.id]);
    for (const p of ps) await c.query('INSERT INTO banca_projetos (banca_id, projeto_id) VALUES ($1,$2)', [b.id, p]);
    await c.query('DELETE FROM banca_avaliadores WHERE banca_id=$1', [b.id]);
    for (const a of avs) await c.query('INSERT INTO banca_avaliadores (banca_id, usuario_id) VALUES ($1,$2)', [b.id, a]);
    await c.query('DELETE FROM criterios WHERE banca_id=$1', [b.id]);
    for (const k of criterios) {
      await c.query('INSERT INTO criterios (banca_id, titulo, peso, descritores) VALUES ($1,$2,$3,$4)', [b.id, k.titulo.trim(), Number(k.peso), JSON.stringify(k.descritores || {})]);
    }
  });

  await auditar(req, 'banca.editar', 'banca', b.id);
  res.json({ ok: true });
});

// Rubricas só podem mudar enquanto a banca não tem notas (preserva o histórico).
router.put('/criterios/:id/descritores', exige('admin'), async (req, res) => {
  const c = await um('SELECT c.id, c.banca_id FROM criterios c JOIN bancas b ON b.id = c.banca_id WHERE c.id=$1 AND b.instituicao_id=$2', [Number(req.params.id) || 0, req.u.inst]);
  if (!c) return erro(res, 'Critério não encontrado', 404);
  if (await um('SELECT 1 FROM avaliacoes WHERE banca_id=$1 LIMIT 1', [c.banca_id])) return erro(res, 'Banca já possui avaliações; crie uma nova banca', 409);
  await consulta('UPDATE criterios SET descritores=$1 WHERE id=$2', [JSON.stringify(req.body || {}), c.id]);
  await auditar(req, 'criterio.descritores', 'criterio', c.id);
  res.json({ ok: true });
});

router.post('/bancas/:id/publicar', exige('admin', 'coordenador'), async (req, res) => {
  const b = await bancaDaInstituicao(req, req.params.id);
  if (!b) return erro(res, 'Banca não encontrada', 404);
  await consulta("UPDATE bancas SET publicada=TRUE, status='encerrada' WHERE id=$1", [b.id]);
  await auditar(req, 'banca.publicar', 'banca', b.id);
  res.json({ ok: true });
});

router.get('/bancas/:id/ranking', async (req, res) => {
  const b = await bancaDaInstituicao(req, req.params.id);
  if (!b) return erro(res, 'Banca não encontrada', 404);
  if (!ehGestor(req) && !b.publicada) return erro(res, 'Resultado ainda não publicado', 403);
  res.json({ banca: { id: b.id, nome: b.nome, publicada: b.publicada }, ...(await calcularRanking(b)) });
});

// Lançamento de notas: todos os critérios de uma vez, uma única vez por avaliador/projeto.
router.post('/avaliacoes', exige('avaliador'), async (req, res) => {
  const { banca_id, projeto_id, notas } = req.body || {};
  const b = await bancaDaInstituicao(req, banca_id);
  if (!b) return erro(res, 'Banca não encontrada', 404);
  if (b.status !== 'aberta') return erro(res, 'Banca encerrada', 409);
  if (!(await um('SELECT 1 FROM banca_avaliadores WHERE banca_id=$1 AND usuario_id=$2', [b.id, req.u.id]))) return erro(res, 'Você não foi designado para esta banca', 403);
  if (!(await um('SELECT 1 FROM banca_projetos WHERE banca_id=$1 AND projeto_id=$2', [b.id, Number(projeto_id) || 0]))) return erro(res, 'Projeto não pertence à banca', 404);
  const criterios = await consulta('SELECT id FROM criterios WHERE banca_id=$1', [b.id]);
  if (criterios.some(c => !Number.isInteger(notas?.[c.id]) || notas[c.id] < 1 || notas[c.id] > 5)) return erro(res, 'Informe nota inteira de 1 a 5 para todos os critérios');
  if (await um('SELECT 1 FROM avaliacoes WHERE banca_id=$1 AND projeto_id=$2 AND avaliador_id=$3 LIMIT 1', [b.id, projeto_id, req.u.id])) return erro(res, 'Avaliação já enviada para este projeto', 409);
  await transacao(async c => {
    for (const k of criterios) await c.query('INSERT INTO avaliacoes (banca_id, projeto_id, avaliador_id, criterio_id, nota) VALUES ($1,$2,$3,$4,$5)', [b.id, projeto_id, req.u.id, k.id, notas[k.id]]);
  });
  await auditar(req, 'avaliacao.criar', 'projeto', projeto_id, { banca: b.id, notas });
  res.status(201).json({ recibo: `AV-${b.id}-${projeto_id}-${req.u.id}-${Date.now().toString(36).toUpperCase()}` });
});

module.exports = router;