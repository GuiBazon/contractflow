// RF03 / RNF04 - restringe rotas a usuarios com perfil ADMIN
function requireAdmin(req, res, next) {
  if (!req.user || req.user.perfil !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = requireAdmin;