const test = require('node:test');
const assert = require('node:assert/strict');
const { emailValido } = require('../src/utils');

test('valida endereços de e-mail e aceita espaços externos para normalização', () => {
  for (const endereco of ['pessoa@exemplo.com', 'nome.sobrenome+teste@sub.exemplo.com', ' pessoa@exemplo.com ']) {
    assert.equal(emailValido(endereco), true, endereco);
  }
});

test('rejeita formatos de e-mail incompletos ou inválidos', () => {
  for (const endereco of ['', null, 'pessoa', 'pessoa@', 'pessoa@exemplo', ' pessoa @exemplo.com', 'pessoa..dois@exemplo.com', 'pessoa@-exemplo.com', 'pessoa@exemplo-.com', 'pessoa@exemplo.com\n', `${'a'.repeat(250)}@exemplo.com`]) {
    assert.equal(emailValido(endereco), false, String(endereco));
  }
});
