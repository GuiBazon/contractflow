const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não informado' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    req.user = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      perfil: decoded.perfil,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

module.exports = authMiddleware;