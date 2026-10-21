const express = require('express');
const { consulta, um, transacao } = require('../config/db');
const { exige } = require('../middlewares/auth');
const { erro, ehGestor, auditar, temPapel } = require('../utils');
const { COLUNAS, filtrarProjetos } = require('../services/projetos');
const router = express.Router();
const STATUS = ['ideacao', 'em_andamento', 'concluido', 'arquivado'];

router.get('/projetos', async (req, res) => {
  const f = filtrarProjetos(req);
  const limite = Math.min(Number(req.query.limit) || 10, 50), pagina = Math.max(Number(req.query.page) || 1, 1);
  const total = (await um(`SELECT COUNT(*)::int AS n ${f.from}`, f.valores)).n;
  const sql = `${COLUNAS}${f.from} ORDER BY p.ano DESC, p.semestre DESC, p.nome LIMIT ${f.p(limite)} OFFSET ${f.p((pagina - 1) * limite)}`;
  res.json({ total, itens: await consulta(sql, f.valores) });
});

router.get('/projetos/:id', async (req, res) => {
  const f = filtrarProjetos(req, req.params.id);
  const projeto = await um(`${COLUNAS}${f.from}`, f.valores);
  // 404 também quando o projeto é de outra instituição: não revela que ele existe.
  projeto ? res.json(projeto) : erro(res, 'Projeto não encontrado', 404);
});

router.post('/projetos', exige('admin', 'coordenador', 'orientador'), async (req, res) => {
  const b = req.body || {};
  const orientador = ehGestor(req) ? (Number(b.orientador_id) || null) : req.u.id;   // orientador comum só cria projetos dele
  const membros = Array.isArray(b.membros) ? b.membros.map(Number) : [];
  if (!b.nome?.trim() || !Number.isInteger(+b.ano) || ![1, 2].includes(+b.semestre) || !STATUS.includes(b.status || 'ideacao')) return erro(res, 'Dados inválidos');
  if (orientador && !(await temPapel(orientador, req.u.inst, 'orientador'))) return erro(res, 'Orientador inválido para esta instituição');
  for (const m of membros) if (!(await temPapel(m, req.u.inst, 'aluno'))) return erro(res, 'Integrante inválido para esta instituição');
  const id = await transacao(async c => {
    const { rows: [p] } = await c.query(`INSERT INTO projetos (instituicao_id, nome, descricao, ano, semestre, status, orientador_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [req.u.inst, b.nome.trim(), b.descricao || '', +b.ano, +b.semestre, b.status || 'ideacao', orientador]);
    for (const m of membros) await c.query('INSERT INTO membros (projeto_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [p.id, m]);
    return p.id;
  });
  await auditar(req, 'projeto.criar', 'projeto', id);
  res.status(201).json({ id });
});

router.put('/projetos/:id', exige('admin', 'coordenador'), async (req, res) => {
  const b = req.body || {};
  if (b.status && !STATUS.includes(b.status)) return erro(res, 'Status inválido');
  const r = await consulta(`UPDATE projetos SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), status = COALESCE($3, status)
    WHERE id=$4 AND instituicao_id=$5 AND NOT excluido RETURNING id`, [b.nome?.trim() || null, b.descricao ?? null, b.status || null, Number(req.params.id) || 0, req.u.inst]);
  if (!r.length) return erro(res, 'Projeto não encontrado', 404);
  await auditar(req, 'projeto.editar', 'projeto', r[0].id, b);
  res.json({ ok: true });
});

// Exclusão lógica: o projeto some das listas, mas o histórico de avaliações é preservado.
router.delete('/projetos/:id', exige('admin'), async (req, res) => {
  const r = await consulta("UPDATE projetos SET excluido=TRUE, status='arquivado' WHERE id=$1 AND instituicao_id=$2 RETURNING id", [Number(req.params.id) || 0, req.u.inst]);
  if (!r.length) return erro(res, 'Projeto não encontrado', 404);
  await auditar(req, 'projeto.arquivar', 'projeto', r[0].id);
  res.status(204).end();
});

module.exports = router;
