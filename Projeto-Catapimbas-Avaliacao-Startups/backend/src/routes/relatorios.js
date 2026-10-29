const express = require('express'), ExcelJS = require('exceljs');
const { consulta, um } = require('../config/db');
const { ehGestor, auditar } = require('../utils');
const { COLUNAS, filtrarProjetos } = require('../services/projetos');
const { calcularRanking } = require('../services/ranking');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  const f = filtrarProjetos(req);
  res.json({
    total: (await um(`SELECT COUNT(*)::int AS n ${f.from}`, f.valores)).n,
    porStatus: await consulta(`SELECT p.status, COUNT(*)::int AS n ${f.from} GROUP BY p.status`, f.valores),
    porPeriodo: await consulta(`SELECT p.ano, p.semestre, COUNT(*)::int AS n ${f.from} GROUP BY p.ano, p.semestre ORDER BY p.ano, p.semestre`, f.valores),
    avaliacoes: (await um(`SELECT COUNT(*)::int AS n FROM (SELECT DISTINCT a.banca_id, a.projeto_id, a.avaliador_id
      FROM avaliacoes a JOIN bancas b ON b.id = a.banca_id WHERE b.instituicao_id=$1 AND ($2 OR a.avaliador_id=$3)) t`,
      [req.u.inst, ehGestor(req), req.u.id])).n,
    bancas: (await um('SELECT COUNT(*)::int AS n FROM bancas WHERE instituicao_id=$1', [req.u.inst])).n
  });
});

// Evita que uma célula começando com = + - @ seja interpretada como fórmula no Excel.
const seguro = v => typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;

// Exportação: usa os mesmos filtros e a mesma regra de visibilidade da listagem de projetos.
router.get('/exportar', async (req, res) => {
  const f = filtrarProjetos(req);
  const projetos = await consulta(`${COLUNAS}${f.from} ORDER BY p.ano DESC, p.semestre DESC, p.nome`, f.valores);
  const livro = new ExcelJS.Workbook(), aba = livro.addWorksheet('Projetos');
  aba.columns = ['Projeto', 'Descrição', 'Orientador', 'Equipe', 'Ano', 'Semestre', 'Status'].map(h => ({ header: h, width: 24 }));
  projetos.forEach(p => aba.addRow([p.nome, p.descricao, p.orientador, p.equipe, p.ano, p.semestre, p.status].map(seguro)));

  const banca = req.query.banca_id && await um('SELECT * FROM bancas WHERE id=$1 AND instituicao_id=$2', [Number(req.query.banca_id) || 0, req.u.inst]);
  if (banca && (ehGestor(req) || banca.publicada)) {
    const aba2 = livro.addWorksheet('Ranking');
    aba2.addRow(['Posição', 'Projeto', 'Pontuação', 'Avaliadores', 'Empate']);
    (await calcularRanking(banca)).ranking.forEach(r => aba2.addRow([r.posicao, seguro(r.nome), r.pontuacao, r.avaliadores, r.empate ? 'Sim' : 'Não']));
  }
  await auditar(req, 'exportar.xlsx', 'projeto', null, { filtros: req.query });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projetos.xlsx"');
  await livro.xlsx.write(res);
  res.end();
});

module.exports = router;
