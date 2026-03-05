const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });

    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE', [email]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    await db.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const register = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'consultor' } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });

    const [dup] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (dup.length)
      return res.status(409).json({ success: false, message: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [r]  = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?,?,?,?)',
      [nombre, email, hash, rol]
    );
    res.status(201).json({ success: true, message: 'Usuario creado', id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,nombre,email,rol,ultimo_acceso,created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid)
      return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { login, register, getMe, changePassword };
