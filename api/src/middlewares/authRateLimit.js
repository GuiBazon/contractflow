const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');

function createAuthRateLimits({ windowMs = 15 * 60 * 1000, ipLimit = 30, accountLimit = 5 } = {}) {
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
  const emailKey = req => crypto.createHash('sha256')
    .update(req.body.email.trim().toLowerCase()).digest('hex');
  const missingEmail = req => typeof req.body?.email !== 'string' || !req.body.email.trim();
  return {
    login: [
      limiter('login-ip', ipLimit, { skipSuccessfulRequests: true }),
      limiter('login-conta', accountLimit, { keyGenerator: emailKey, skip: missingEmail, skipSuccessfulRequests: true }),
    ],
    register: [limiter('cadastro-ip', 20)],
    forgotPassword: [
      limiter('recuperacao-ip', 20),
      limiter('recuperacao-conta', 3, { keyGenerator: emailKey, skip: missingEmail }),
    ],
    resetPassword: [limiter('redefinicao-ip', 20)],
  };
}

module.exports = { createAuthRateLimits, authRateLimits: createAuthRateLimits() };
