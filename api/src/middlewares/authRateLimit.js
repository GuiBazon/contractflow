const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');
const db = require('../config/db');

// A comparação de e-mails no login segue a collation do banco, que pode tratar
// strings Unicode diferentes como iguais. Usar o peso da mesma collation para
// qualquer endereço (inclusive inexistente) evita tanto chaves divergentes como
// uma consulta que revele se uma conta existe.
let emailCollation;
async function accountKey(email) {
  if (!emailCollation) {
    emailCollation = db.execute(`SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='email'`)
      .then(([[column]]) => {
        if (!column || !/^[a-z0-9_]+$/i.test(column.charset) || !/^[a-z0-9_]+$/i.test(column.collation)) throw new Error('Collation de usuarios.email indisponível');
        return column;
      }).catch(err => { emailCollation = undefined; throw err; });
  }
  const { charset, collation } = await emailCollation;
  const [[row]] = await db.execute(`SELECT HEX(WEIGHT_STRING(CONVERT(? USING ${charset}) COLLATE ${collation})) AS weight`, [email]);
  return crypto.createHash('sha256').update(row.weight).digest('hex');
}

// Primeiro vem o limite por IP; assim até a consulta para normalizar a chave
// fica sujeita ao mesmo limite. Endereços fora do tamanho aceito no cadastro
// não precisam ocupar a conexão ao banco.
function rejectOversizedEmail(req, res, next) {
  if (typeof req.body?.email === 'string' && req.body.email.trim().length > 150) {
    return res.status(400).json({ message: 'E-mail inválido' });
  }
  next();
}

function createAuthRateLimits({ windowMs = 15 * 60 * 1000, ipLimit = 30, accountLimit = 5, resolveAccountKey = accountKey } = {}) {
  function limiter(identifier, limit, options = {}) {
    return rateLimit({
      windowMs, limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      identifier,
      message: { message: 'Muitas tentativas. Aguarde o intervalo indicado em Retry-After e tente novamente.' },
      ...options,
    });
  }
  const emailKey = req => resolveAccountKey(req.body.email.trim().toLowerCase());
  const missingEmail = req => typeof req.body?.email !== 'string' || !req.body.email.trim();
  return {
    login: [
      limiter('login-ip', ipLimit, { skipSuccessfulRequests: true }),
      rejectOversizedEmail,
      limiter('login-conta', accountLimit, { keyGenerator: emailKey, skip: missingEmail, skipSuccessfulRequests: true }),
    ],
    register: [limiter('cadastro-ip', 20)],
    forgotPassword: [
      limiter('recuperacao-ip', 20),
      rejectOversizedEmail,
      limiter('recuperacao-conta', 3, { keyGenerator: emailKey, skip: missingEmail }),
    ],
    resetPassword: [limiter('redefinicao-ip', 20)],
  };
}

module.exports = { createAuthRateLimits, authRateLimits: createAuthRateLimits() };
