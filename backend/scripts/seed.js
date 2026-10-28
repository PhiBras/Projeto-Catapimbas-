// Dados de demonstração: npm run seed   (APAGA os dados existentes! Nunca rode no banco real)
const bcrypt = require('bcryptjs');
const { pool, um, consulta } = require('../src/config/db');

async function semear() {
  const ins = async (sql, p) => (await um(sql + ' RETURNING id', p)).id;
  await consulta('TRUNCATE auditoria, sessoes, avaliacoes, criterios, banca_avaliadores, banca_projetos, bancas, membros, projetos, vinculos, usuarios, instituicoes RESTART IDENTITY CASCADE');
  const hash = await bcrypt.hash('Senha@123', 10);
  const usuario = (nome, email, sup = false) => ins('INSERT INTO usuarios (nome, email, hash, superadmin) VALUES ($1,$2,$3,$4)', [nome, email, hash, sup]);
  const vinculo = (u, i, papel, situacao = 'aprovado') => consulta('INSERT INTO vinculos (usuario_id, instituicao_id, papel, situacao) VALUES ($1,$2,$3,$4)', [u, i, papel, situacao]);

  const A = await ins('INSERT INTO instituicoes (nome, identificador, cor) VALUES ($1,$2,$3)', ['Instituição Demo A', 'demo-a', '#2563eb']);
  const B = await ins('INSERT INTO instituicoes (nome, identificador, cor) VALUES ($1,$2,$3)', ['Instituição Demo B', 'demo-b', '#059669']);
  await usuario('Super Admin', 'super@demo.com', true);
  await vinculo(await usuario('Admin A', 'admin.a@demo.com'), A, 'admin');
  await vinculo(await usuario('Coordenadora A', 'coord.a@demo.com'), A, 'coordenador');
  const orientadora = await usuario('Orientadora A', 'orient.a@demo.com'); await vinculo(orientadora, A, 'orientador');
  const aluno = await usuario('Aluno A', 'aluno.a@demo.com'); await vinculo(aluno, A, 'aluno');
  const avaliadores = [];
  for (const [nome, email] of [['André Rocha', 'andre@demo.com'], ['Celso Barreto', 'celso@demo.com'], ['Laura Gurgel', 'laura@demo.com']]) {
    const u = await usuario(nome, email); await vinculo(u, A, 'avaliador'); avaliadores.push(u);
  }
  await vinculo(await usuario('Pendente A', 'pendente.a@demo.com'), A, 'aluno', 'pendente');
  await vinculo(await usuario('Admin B', 'admin.b@demo.com'), B, 'admin');
  await vinculo(avaliadores[0], B, 'orientador');   // mesmo usuário: avaliador na A e orientador na B

  const projetos = [];
  for (const nome of ['AcolheMãe', 'InovArt', 'VANMO', 'HECO', 'SalvadorGO!'])
    projetos.push(await ins(`INSERT INTO projetos (instituicao_id, nome, descricao, ano, semestre, status, orientador_id)
      VALUES ($1,$2,'Projeto de demonstração',2025,1,'concluido',$3)`, [A, nome, orientadora]));
  await consulta('INSERT INTO membros (projeto_id, usuario_id) VALUES ($1,$2)', [projetos[0], aluno]);
  await ins("INSERT INTO projetos (instituicao_id, nome, descricao, ano, semestre) VALUES ($1,'Projeto da Instituição B','Não deve aparecer na A',2025,1)", [B]);

  const banca = await ins('INSERT INTO bancas (instituicao_id, nome) VALUES ($1,$2)', [A, '[DE 2025-1] Banca Final de Avaliação das Startups']);
  const descritores = JSON.stringify({ 1: 'Insuficiente', 2: 'Fraco', 3: 'Adequado', 4: 'Bom', 5: 'Excelente' });   // o admin pode cadastrar as rubricas reais
  for (const t of ['Clareza do Problema', 'Mercado e Escalabilidade', 'Conceito e Produto', 'Estratégia de Diferenciação', 'Desempenho da Apresentação'])
    await consulta('INSERT INTO criterios (banca_id, titulo, peso, descritores) VALUES ($1,$2,1,$3)', [banca, t, descritores]);
  for (const p of projetos) await consulta('INSERT INTO banca_projetos VALUES ($1,$2)', [banca, p]);
  for (const a of avaliadores) await consulta('INSERT INTO banca_avaliadores VALUES ($1,$2)', [banca, a]);
}
module.exports = { semear };

if (require.main === module) {
  if (process.env.NODE_ENV === 'production') { console.error('Seed bloqueado em produção.'); process.exit(1); }
  semear().then(() => { console.log('Dados de demonstração criados. Senha de todas as contas: Senha@123'); return pool.end(); })
    .catch(e => { console.error(e.message); process.exit(1); });
}
