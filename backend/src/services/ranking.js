const { consulta } = require('../config/db');

function atribuirPosicoes(ranking) {
  let posicao = 0;
  ranking.forEach((r, i) => {
    if (i === 0 || r.pontuacao !== ranking[i - 1].pontuacao) posicao += 1;
    r.posicao = posicao;
    r.empate = ranking.filter(x => x.pontuacao === r.pontuacao).length > 1;
  });
  return ranking;
}

// Cálculo da pontuação (documentar no relatório):
//  - por avaliador: soma(nota × peso) / soma(pesos);
//  - do projeto: média dos avaliadores que preencheram TODOS os critérios (avaliação completa);
//  - arredondamento: 2 casas decimais.
// Empate: projetos com a mesma pontuação ficam na mesma posição, sem deixar posições vazias (1, 2, 2, 3).
async function calcularRanking(banca) {
  const criterios = await consulta('SELECT id, peso FROM criterios WHERE banca_id=$1', [banca.id]);
  const somaPesos = criterios.reduce((s, c) => s + c.peso, 0);
  const projetos = await consulta(`SELECT p.id, p.nome FROM banca_projetos bp JOIN projetos p ON p.id = bp.projeto_id
    WHERE bp.banca_id=$1 AND NOT p.excluido AND p.status <> 'arquivado'`, [banca.id]);
  const notas = await consulta('SELECT projeto_id, avaliador_id, criterio_id, nota FROM avaliacoes WHERE banca_id=$1', [banca.id]);

  const resultado = projetos.map(p => {
    const porAvaliador = {};
    notas.filter(n => n.projeto_id === p.id).forEach(n => { (porAvaliador[n.avaliador_id] ??= {})[n.criterio_id] = n.nota; });
    const medias = Object.values(porAvaliador)
      .filter(n => Object.keys(n).length === criterios.length)
      .map(n => criterios.reduce((s, c) => s + n[c.id] * c.peso, 0) / somaPesos);
    const pontuacao = medias.length ? Math.round(medias.reduce((a, b) => a + b, 0) / medias.length * 100) / 100 : null;
    return { id: p.id, nome: p.nome, avaliadores: medias.length, pontuacao };
  });

  const ranking = resultado.filter(r => r.pontuacao !== null).sort((a, b) => b.pontuacao - a.pontuacao || a.nome.localeCompare(b.nome));
  return { ranking: atribuirPosicoes(ranking), semNota: resultado.filter(r => r.pontuacao === null) };
}

module.exports = { calcularRanking, atribuirPosicoes };
