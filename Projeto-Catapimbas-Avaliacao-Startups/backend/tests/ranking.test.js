const test = require('node:test');
const assert = require('node:assert/strict');
const { atribuirPosicoes } = require('../src/services/ranking');

test('empates mantêm a posição e não deixam lacunas na classificação', () => {
  const ranking = [
    { pontuacao: 4.5 },
    { pontuacao: 3 },
    { pontuacao: 3 },
    { pontuacao: 1.75 }
  ];

  atribuirPosicoes(ranking);

  assert.deepEqual(ranking.map(item => item.posicao), [1, 2, 2, 3]);
  assert.deepEqual(ranking.map(item => item.empate), [false, true, true, false]);
});
