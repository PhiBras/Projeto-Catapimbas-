// Testes de autorização e regras de negócio. Usam um banco SEPARADO (DATABASE_URL_TESTE), pois o seed apaga tudo.
require('dotenv').config();
if (!process.env.DATABASE_URL_TESTE) throw new Error('Defina DATABASE_URL_TESTE no .env (banco de testes com as tabelas criadas)');
process.env.DATABASE_URL = process.env.DATABASE_URL_TESTE;

const test = require('node:test'), assert = require('node:assert');
const { semear } = require('../scripts/seed');
const { pool } = require('../src/config/db');
const app = require('../src/app');

let servidor, base;
const J = { 'Content-Type': 'application/json' };
test.before(async () => { await semear(); servidor = app.listen(0); base = `http://localhost:${servidor.address().port}/api`; });
test.after(async () => { servidor.close(); await pool.end(); });

async function login(email) {
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ email, senha: 'Senha@123' }) });
  return { status: r.status, h: { ...J, cookie: (r.headers.get('set-cookie') || '').split(';')[0] } };
}
const notas = n => ({ 1: n, 2: n, 3: n, 4: n, 5: n });

test('conta pendente não acessa o sistema', async () => assert.equal((await login('pendente.a@demo.com')).status, 403));

test('administrador da instituição B não enxerga dados da A trocando o ID', async () => {
  const { h } = await login('admin.b@demo.com');
  assert.equal((await fetch(base + '/projetos/1', { headers: h })).status, 404);
  const lista = await (await fetch(base + '/projetos', { headers: h })).json();
  assert.ok(lista.itens.every(p => p.nome === 'Projeto da Instituição B'));
  assert.equal((await fetch(base + '/bancas/1/ranking', { headers: h })).status, 404);
});

test('só avaliador designado lança nota, e a segunda submissão é rejeitada', async () => {
  const { h } = await login('andre@demo.com'), corpo = JSON.stringify({ banca_id: 1, projeto_id: 1, notas: notas(4) });
  assert.equal((await fetch(base + '/avaliacoes', { method: 'POST', headers: h, body: corpo })).status, 201);
  assert.equal((await fetch(base + '/avaliacoes', { method: 'POST', headers: h, body: corpo })).status, 409);
  const aluno = await login('aluno.a@demo.com');
  assert.equal((await fetch(base + '/avaliacoes', { method: 'POST', headers: aluno.h, body: corpo })).status, 403);
});

test('ranking em rascunho só aparece para gestores e usa média ponderada', async () => {
  const aluno = await login('aluno.a@demo.com'), admin = await login('admin.a@demo.com');
  assert.equal((await fetch(base + '/bancas/1/ranking', { headers: aluno.h })).status, 403);
  const d = await (await fetch(base + '/bancas/1/ranking', { headers: admin.h })).json();
  assert.equal(d.ranking[0].pontuacao, 4);
  assert.equal(d.ranking[0].posicao, 1);
});

test('bloquear um vínculo vale já na próxima chamada da API', async () => {
  const admin = await login('admin.a@demo.com'), aluno = await login('aluno.a@demo.com');
  assert.equal((await fetch(base + '/projetos', { headers: aluno.h })).status, 200);
  const v = (await (await fetch(base + '/vinculos', { headers: admin.h })).json()).find(x => x.email === 'aluno.a@demo.com');
  await fetch(`${base}/vinculos/${v.id}/situacao`, { method: 'POST', headers: admin.h, body: JSON.stringify({ situacao: 'bloqueado', justificativa: 'teste' }) });
  assert.equal((await fetch(base + '/projetos', { headers: aluno.h })).status, 403);
});
