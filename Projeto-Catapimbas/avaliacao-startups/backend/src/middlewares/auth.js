const { consulta, um } = require('../config/db');
const { erro } = require('../utils');

function lerCookie(req, nome) {
  const par = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(nome + '='));
  return par ? par.slice(nome.length + 1) : null;
}

// Identifica o usuário pela sessão e carrega seus papéis NA INSTITUIÇÃO ATIVA.
// Os papéis são lidos do banco a cada requisição: se o acesso for revogado, vale na hora.
async function autenticar(req, res, next) {
  const token = lerCookie(req, 'sid');
  const s = token && await um(`SELECT s.usuario_id, s.instituicao_id, u.nome, u.superadmin, u.status
    FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token = $1 AND s.criada > now() - interval '8 hours'`, [token]);
  if (!s || s.status !== 'ativo') return erro(res, 'Não autenticado', 401);
  const papeis = s.instituicao_id ? (await consulta(`SELECT v.papel FROM vinculos v JOIN instituicoes i ON i.id = v.instituicao_id
    WHERE v.usuario_id = $1 AND v.instituicao_id = $2 AND v.situacao = 'aprovado' AND i.status = 'ativa'`,
    [s.usuario_id, s.instituicao_id])).map(r => r.papel) : [];
  req.u = { id: s.usuario_id, nome: s.nome, super: s.superadmin, inst: s.instituicao_id, papeis, token };
  next();
}

// Exige pelo menos um dos papéis informados. Ex.: exige('admin', 'coordenador')
const exige = (...papeis) => (req, res, next) =>
  papeis.some(p => req.u.papeis.includes(p)) ? next() : erro(res, 'Sem permissão', 403);
const soSuper = (req, res, next) => req.u.super ? next() : erro(res, 'Sem permissão', 403);
const temInstituicao = (req, res, next) =>
  req.u.papeis.length ? next() : erro(res, 'Sem acesso a nenhuma instituição ativa', 403);

module.exports = { autenticar, exige, soSuper, temInstituicao };
