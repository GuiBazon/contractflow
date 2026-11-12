const { isEmail } = require('../utils/validators');
const { HttpError } = require('../utils/http');
const recovery = require('../services/passwordRecoveryService');

async function forgot(req, res) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!isEmail(email) || email.length > 150) throw new HttpError(400, 'Informe um e-mail válido');
  await recovery.requestReset(email);
  res.json({ message: 'Se a conta estiver ativa, enviaremos as instruções de recuperação para o e-mail informado.' });
}

async function reset(req, res) {
  await recovery.resetPassword(req.body.token, req.body.nova_senha);
  res.json({ message: 'Senha redefinida; entre novamente' });
}

module.exports = { forgot, reset };
