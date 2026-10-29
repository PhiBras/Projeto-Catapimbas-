const nodemailer = require('nodemailer');

const configurado = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM &&
  (process.env.NODE_ENV !== 'production' || process.env.FRONTEND_URL)
);

async function enviarLink(destinatario, token, tipo) {
  if (!configurado()) throw new Error('Configuração SMTP ausente.');

  const frontend = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
  if (!frontend) throw new Error('FRONTEND_URL não configurada.');

  const porta = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const link = new URL('/', frontend);
  const recuperacao = tipo === 'recuperacao';
  link.searchParams.set(recuperacao ? 'recuperar' : 'confirmarEmail', token);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: destinatario,
    subject: recuperacao ? 'Redefinição de senha - Catapimbas' : 'Confirme seu e-mail - Catapimbas',
    text: recuperacao
      ? `Use este link para redefinir sua senha (válido por 1 hora): ${link.href}`
      : `Use este link para confirmar seu e-mail (válido por 24 horas): ${link.href}`,
    html: recuperacao
      ? `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${link.href}">Redefinir senha</a></p><p>O link é válido por 1 hora. Se você não fez essa solicitação, ignore este e-mail.</p>`
      : `<p>Confirme que este endereço de e-mail pertence a você.</p><p><a href="${link.href}">Confirmar e-mail</a></p><p>O link é válido por 24 horas.</p>`
  });
}

module.exports = {
  configurado,
  enviarRecuperacao: (destinatario, token) => enviarLink(destinatario, token, 'recuperacao'),
  enviarConfirmacao: (destinatario, token) => enviarLink(destinatario, token, 'confirmacao')
};
