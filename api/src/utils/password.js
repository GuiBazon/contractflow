const { HttpError } = require('./http');

function password(value) {
  if (typeof value !== 'string' || value.length < 6 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, 'Senha deve ter ao menos 6 caracteres e até 72 bytes');
  }
  return value;
}

module.exports = { password };
