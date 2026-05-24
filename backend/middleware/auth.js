// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Vérifie que l'utilisateur est connecté (token valide)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Le token arrive sous la forme : "Bearer xxxxx"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé : aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // on garde { id, role } accessible dans les routes
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
}

// Vérifie que l'utilisateur a l'un des rôles autorisés
// Exemple d'usage : authorizeRoles('admin', 'agent')
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit : rôle non autorisé' });
    }
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };