const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];

  if (!token)
    return res.status(401).json({ success: false, message: 'Token requerido' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
}

module.exports = { verifyToken };
