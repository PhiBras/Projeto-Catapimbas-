const { ehGestor } = require('../utils');

const COLUNAS = `SELECT p.id, p.nome, p.descricao, p.ano, p.semestre, p.status, o.nome AS orientador,
  (SELECT STRING_AGG(u.nome, ', ') FROM membros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.projeto_id = p.id) AS equipe `;

// Monta o FROM/WHERE de projetos. TODA consulta de projetos passa por aqui, então:
//  1) só aparecem projetos da instituição ativa da sessão (nunca de outra);
//  2) quem não é gestor só vê seus próprios projetos ou os das suas bancas.
function filtrarProjetos(req, id) {
  const { q, ano, semestre, orientador, aluno } = req.query;
  const valores = [req.u.inst];
  const p = v => { valores.push(v); return '$' + valores.length; };   // guarda o valor e devolve $2, $3...
  const w = ['p.instituicao_id = $1', 'NOT p.excluido'];
  if (!ehGestor(req)) {
    const eu = p(req.u.id);
    w.push(`(p.orientador_id = ${eu}
      OR EXISTS (SELECT 1 FROM membros m WHERE m.projeto_id = p.id AND m.usuario_id = ${eu})
      OR p.id IN (SELECT bp.projeto_id FROM banca_projetos bp JOIN banca_avaliadores ba ON ba.banca_id = bp.banca_id WHERE ba.usuario_id = ${eu}))`);
  }
  if (id !== undefined) w.push(`p.id = ${p(Number(id) || 0)}`);
  if (q) w.push(`p.nome ILIKE ${p('%' + q + '%')}`);
  if (ano) w.push(`p.ano = ${p(Number(ano) || 0)}`);
  if (semestre) w.push(`p.semestre = ${p(Number(semestre) || 0)}`);
  if (orientador) w.push(`o.nome ILIKE ${p('%' + orientador + '%')}`);
  if (aluno) w.push(`EXISTS (SELECT 1 FROM membros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.projeto_id = p.id AND u.nome ILIKE ${p('%' + aluno + '%')})`);
  return { from: `FROM projetos p LEFT JOIN usuarios o ON o.id = p.orientador_id WHERE ${w.join(' AND ')}`, valores, p };
}

module.exports = { COLUNAS, filtrarProjetos };
