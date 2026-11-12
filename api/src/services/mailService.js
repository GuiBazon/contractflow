const nodemailer = require('nodemailer');
const { HttpError } = require('../utils/http');

function settings() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  let resetUrl;
  try { resetUrl = new URL(process.env.PASSWORD_RESET_URL); } catch { /* configuração ausente */ }
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host || !from || !resetUrl || !['http:', 'https:'].includes(resetUrl.protocol)
      || resetUrl.username || resetUrl.password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new HttpError(503, 'Recuperação de senha indisponível; tente novamente mais tarde');
  }
  const secure = process.env.SMTP_SECURE === 'true';
  const local = ['127.0.0.1', 'localhost', '::1', 'mailpit'].includes(host);
  const requireTLS = !secure && !local;
  return {
    from, resetUrl,
    transport: {
      host, port, secure, requireTLS,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    },
  };
}

async function sendPasswordReset(email, token, minutes) {
  const config = settings();
  config.resetUrl.searchParams.set('token', token);
  const transport = nodemailer.createTransport(config.transport);
  try {
    await transport.sendMail({
      from: config.from, to: email,
      subject: 'ContractFlow — recuperação de senha',
      text: `Recebemos uma solicitação para redefinir sua senha no ContractFlow.\n\n${config.resetUrl.toString()}\n\nO link é de uso único e expira em ${minutes} minutos. Se você não solicitou a alteração, ignore esta mensagem.`,
    });
  } finally { transport.close(); }
}

module.exports = { settings, sendPasswordReset };
