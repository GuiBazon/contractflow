const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { asyncHandler } = require('../utils/http');

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Token não informado' });
  let decoded;
  try {
    decoded = jwt.verify(header.slice(7).trim(), process.env.JWT_SECRET);
    if (!Number.isSafeInteger(decoded.id) || decoded.id < 1 || !Number.isSafeInteger(decoded.ver ?? 0)) throw new Error('Token inválido');
  } catch { return res.status(401).json({ message: 'Token inválido ou expirado' }); }
  // Permissão, desativação e revogação valem imediatamente, sem esperar o JWT expirar.
  const [[user]] = await db.execute('SELECT id, nome, email, perfil, ativo, token_version FROM usuarios WHERE id = ?', [decoded.id]);
  if (!user || !user.ativo || Number(user.token_version) !== (decoded.ver ?? 0)) return res.status(401).json({ message: 'Sessão encerrada ou usuário desativado' });
  req.user = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
  next();
});
