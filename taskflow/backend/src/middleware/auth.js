const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.users.find(u => u.id === decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuário não encontrado ou inativo' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado: permissão insuficiente' });
  }
  next();
};

module.exports = { authenticate, authorize };
