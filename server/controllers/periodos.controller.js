const db = require('../config/db');

/** Lista todos los períodos de un plan */
const getAll = async (req, res) => {
  try {
    const { plan_id } = req.query;
    if (!plan_id)
      return res.status(400).json({ success: false, message: 'plan_id requerido' });

    const [rows] = await db.query(
      `SELECT ps.*, u.nombre AS creado_por_nombre
       FROM periodos_seguimiento ps
       LEFT JOIN usuarios u ON u.id = ps.creado_por
       WHERE ps.plan_id = ?
       ORDER BY ps.fecha_inicio DESC`,
      [plan_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Obtiene el período activo de un plan */
const getPeriodoActivo = async (req, res) => {
  try {
    const { plan_id } = req.query;
    if (!plan_id)
      return res.status(400).json({ success: false, message: 'plan_id requerido' });

    const [rows] = await db.query(
      `SELECT * FROM periodos_seguimiento
       WHERE plan_id = ? AND estado = 'activo'
       LIMIT 1`,
      [plan_id]
    );

    // También corroborar si la fecha actual cae dentro del rango
    if (rows.length) {
      const p = rows[0];
      const hoy = new Date().toISOString().slice(0, 10);
      const dentroDeRango = hoy >= p.fecha_inicio.toISOString().slice(0, 10) &&
                            hoy <= p.fecha_cierre.toISOString().slice(0, 10);
      return res.json({ success: true, data: rows[0], dentroDeRango });
    }
    res.json({ success: true, data: null, dentroDeRango: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Crea un nuevo período (solo admin) */
const create = async (req, res) => {
  try {
    const { plan_id, nombre, fecha_inicio, fecha_cierre } = req.body;
    if (!plan_id || !nombre || !fecha_inicio || !fecha_cierre)
      return res.status(400).json({ success: false, message: 'plan_id, nombre, fecha_inicio y fecha_cierre son requeridos' });

    // Validar duración: 14-21 días
    const inicio = new Date(fecha_inicio);
    const cierre = new Date(fecha_cierre);
    const dias   = Math.round((cierre - inicio) / (1000 * 60 * 60 * 24));
    if (dias < 14 || dias > 21)
      return res.status(400).json({
        success: false,
        message: `La duración del período debe ser entre 14 y 21 días (${dias} días indicados)`
      });

    const [r] = await db.query(
      `INSERT INTO periodos_seguimiento (plan_id, nombre, fecha_inicio, fecha_cierre, estado, creado_por)
       VALUES (?,?,?,?,'programado',?)`,
      [plan_id, nombre, fecha_inicio, fecha_cierre, req.user.id]
    );
    res.status(201).json({ success: true, message: 'Período creado', id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Actualiza datos de un período (solo si está en estado programado) */
const update = async (req, res) => {
  try {
    const { nombre, fecha_inicio, fecha_cierre } = req.body;
    const [rows] = await db.query('SELECT * FROM periodos_seguimiento WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Período no encontrado' });

    const periodo = rows[0];
    if (periodo.estado !== 'programado')
      return res.status(400).json({ success: false, message: 'Solo se pueden editar períodos en estado Programado' });

    const inicio = new Date(fecha_inicio);
    const cierre = new Date(fecha_cierre);
    const dias   = Math.round((cierre - inicio) / (1000 * 60 * 60 * 24));
    if (dias < 14 || dias > 21)
      return res.status(400).json({
        success: false,
        message: `La duración debe ser entre 14 y 21 días (${dias} días indicados)`
      });

    await db.query(
      'UPDATE periodos_seguimiento SET nombre=?, fecha_inicio=?, fecha_cierre=? WHERE id=?',
      [nombre, fecha_inicio, fecha_cierre, req.params.id]
    );
    res.json({ success: true, message: 'Período actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Activa un período (solo puede haber 1 activo por plan) */
const activar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM periodos_seguimiento WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Período no encontrado' });

    const periodo = rows[0];
    if (periodo.estado === 'cerrado')
      return res.status(400).json({ success: false, message: 'No se puede reactivar un período cerrado' });

    // Verificar que no haya otro activo en el mismo plan
    const [activos] = await conn.query(
      `SELECT id FROM periodos_seguimiento
       WHERE plan_id = ? AND estado = 'activo' AND id != ?`,
      [periodo.plan_id, req.params.id]
    );
    if (activos.length)
      return res.status(400).json({ success: false, message: 'Ya existe un período activo para este plan' });

    await conn.beginTransaction();
    await conn.query(
      "UPDATE periodos_seguimiento SET estado = 'activo' WHERE id = ?",
      [req.params.id]
    );
    await conn.commit();
    res.json({ success: true, message: 'Período activado' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

/** Cierra un período activo */
const cerrar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM periodos_seguimiento WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Período no encontrado' });
    if (rows[0].estado !== 'activo')
      return res.status(400).json({ success: false, message: 'Solo se pueden cerrar períodos activos' });

    await db.query(
      "UPDATE periodos_seguimiento SET estado = 'cerrado' WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true, message: 'Período cerrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getPeriodoActivo, create, update, activar, cerrar };
