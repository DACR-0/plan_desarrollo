function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin')
    return res.status(403).json({ success: false, message: 'Solo administradores' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ success: false, message: 'No autenticado' });
    if (!roles.includes(req.user.rol))
      return res.status(403).json({ success: false, message: 'Sin permisos suficientes' });
    next();
  };
}

/** Solo usuarios de área estratégica (y admins por defecto pueden usar requireRole) */
function requireAreaUser(req, res, next) {
  if (!req.user)
    return res.status(401).json({ success: false, message: 'No autenticado' });
  if (!['admin','area_estrategica'].includes(req.user.rol))
    return res.status(403).json({ success: false, message: 'Acceso restringido a usuarios de área' });
  next();
}

module.exports = { requireAdmin, requireRole, requireAreaUser };
