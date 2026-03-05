const bcrypt = require('bcryptjs');
const db     = require('../config/db');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.ultimo_acceso, u.created_at,
              GROUP_CONCAT(ua.area_id ORDER BY ua.area_id SEPARATOR ',')  AS areas_ids,
              GROUP_CONCAT(ae.nombre  ORDER BY ua.area_id SEPARATOR '||') AS areas_nombres
       FROM usuarios u
       LEFT JOIN usuario_area ua       ON ua.usuario_id = u.id
       LEFT JOIN areas_estrategicas ae ON ae.id = ua.area_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    const data = rows.map(u => ({
      ...u,
      areas: u.areas_ids
        ? u.areas_ids.split(',').map((id, i) => ({
            id: parseInt(id),
            nombre: (u.areas_nombres || '').split('||')[i] || ''
          }))
        : [],
      areas_ids:     undefined,
      areas_nombres: undefined,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.ultimo_acceso, u.created_at,
              GROUP_CONCAT(ua.area_id ORDER BY ua.area_id SEPARATOR ',')  AS areas_ids,
              GROUP_CONCAT(ae.nombre  ORDER BY ua.area_id SEPARATOR '||') AS areas_nombres
       FROM usuarios u
       LEFT JOIN usuario_area ua       ON ua.usuario_id = u.id
       LEFT JOIN areas_estrategicas ae ON ae.id = ua.area_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    const u = rows[0];
    const data = {
      ...u,
      areas: u.areas_ids
        ? u.areas_ids.split(',').map((id, i) => ({
            id: parseInt(id),
            nombre: (u.areas_nombres || '').split('||')[i] || ''
          }))
        : [],
      areas_ids:     undefined,
      areas_nombres: undefined,
    };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const create = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, email, password, rol = 'consultor', area_ids = [] } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ success: false, message: 'nombre, email y password requeridos' });

    const [dup] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (dup.length) return res.status(409).json({ success: false, message: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES (?,?,?,?)',
      [nombre, email, hash, rol]
    );
    const userId = r.insertId;

    if (rol === 'area_estrategica' && Array.isArray(area_ids) && area_ids.length) {
      for (const areaId of area_ids) {
        await conn.query(
          'INSERT IGNORE INTO usuario_area (usuario_id, area_id) VALUES (?,?)',
          [userId, areaId]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Usuario creado', id: userId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

const update = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, email, rol, activo, password, area_ids = [] } = req.body;

    await conn.beginTransaction();

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        'UPDATE usuarios SET nombre=?,email=?,rol=?,activo=?,password_hash=? WHERE id=?',
        [nombre, email, rol, activo, hash, req.params.id]
      );
    } else {
      await conn.query(
        'UPDATE usuarios SET nombre=?,email=?,rol=?,activo=? WHERE id=?',
        [nombre, email, rol, activo, req.params.id]
      );
    }

    // Re-asignar áreas si el rol es area_estrategica
    if (rol === 'area_estrategica') {
      await conn.query('DELETE FROM usuario_area WHERE usuario_id = ?', [req.params.id]);
      for (const areaId of area_ids) {
        await conn.query(
          'INSERT IGNORE INTO usuario_area (usuario_id, area_id) VALUES (?,?)',
          [req.params.id, areaId]
        );
      }
    } else {
      // Si cambia a otro rol, eliminar asignaciones de área
      await conn.query('DELETE FROM usuario_area WHERE usuario_id = ?', [req.params.id]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Usuario actualizado' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

const remove = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propio usuario' });
    await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Devuelve las áreas asignadas al usuario autenticado (para area_estrategica) */
const getMisAreas = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ae.id, ae.nombre, ae.codigo, ae.plan_id
       FROM usuario_area ua
       JOIN areas_estrategicas ae ON ae.id = ua.area_id
       WHERE ua.usuario_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove, getMisAreas };
