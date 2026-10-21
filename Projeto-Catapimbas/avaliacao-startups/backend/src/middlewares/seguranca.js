const { erro } = require('../utils');

// Cabeçalhos HTTP que reduzem riscos comuns (XSS, clickjacking...).
function cabecalhos(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
  });
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// Origens aceitas em requisições que alteram dados. Em desenvolvimento, o frontend (Vite) roda em outra porta.
// Em produção, o Express entrega o site e a API juntos (mesma origem); se precisar de outras, use ORIGENS_PERMITIDAS no .env.
const origensPermitidas = () => [
  ...(process.env.ORIGENS_PERMITIDAS || '').split(',').map(s => s.trim()).filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])
];

// Proteção extra contra CSRF: requisições que alteram dados devem vir do próprio site.
function verificarOrigem(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.headers.origin) return next();
  if (origensPermitidas().includes(req.headers.origin)) return next();
  try { if (new URL(req.headers.origin).host === req.headers.host) return next(); } catch { /* origem inválida */ }
  erro(res, 'Origem não permitida', 403);
}

// Limita tentativas (ex.: 10 logins em 15 min por IP + e-mail).
const tentativas = new Map();
const limitar = (maximo, janelaMs) => (req, res, next) => {
  const chave = req.ip + req.path + String(req.body?.email || '').toLowerCase(), agora = Date.now();
  const recentes = (tentativas.get(chave) || []).filter(t => agora - t < janelaMs);
  if (recentes.length >= maximo) return erro(res, 'Muitas tentativas. Aguarde alguns minutos.', 429);
  recentes.push(agora); tentativas.set(chave, recentes); next();
};
setInterval(() => { const n = Date.now(); for (const [k, a] of tentativas) if (!a.some(t => n - t < 900000)) tentativas.delete(k); }, 600000).unref();

module.exports = { cabecalhos, verificarOrigem, limitar };