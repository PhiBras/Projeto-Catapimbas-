const { consulta, um } = require('./config/db');

const erro = (res, mensagem, codigo = 400) => res.status(codigo).json({ erro: mensagem });
const ehGestor = req => req.u.papeis.includes('admin') || req.u.papeis.includes('coordenador');
const senhaValida = s => typeof s === 'string' && s.length >= 8 && s.length <= 72;
const emailValido = e => {
  if (typeof e !== 'string' || e.length > 254 || /[\r\n\t]/.test(e)) return false;
  const email = e.trim();
  const partes = email.split('@');
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (local.length > 64 || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)) return false;
  const rotulos = dominio.split('.');
  return rotulos.length >= 2 && rotulos.every(rotulo =>
    rotulo.length > 0 && rotulo.length <= 63 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(rotulo)
  ) && rotulos[rotulos.length - 1].length >= 2;
};

// Registra operações importantes (auditoria).
const auditar = (req, operacao, entidade, entidadeId, detalhes) =>
  consulta('INSERT INTO auditoria (instituicao_id, ator_id, operacao, entidade, entidade_id, detalhes) VALUES ($1,$2,$3,$4,$5,$6)',
    [req.u?.inst ?? null, req.u?.id ?? null, operacao, entidade, entidadeId ?? null, detalhes ? JSON.stringify(detalhes) : null]);

// O usuário tem este papel, aprovado, nesta instituição?
const temPapel = async (usuarioId, instituicaoId, papel) => !!(await um(
  "SELECT 1 FROM vinculos WHERE usuario_id=$1 AND instituicao_id=$2 AND papel=$3 AND situacao='aprovado'", [usuarioId, instituicaoId, papel]));

module.exports = { erro, ehGestor, senhaValida, emailValido, auditar, temPapel };
