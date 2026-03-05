const db = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { plan_id } = req.query;
    const [rows] = await db.query(
      `SELECT ae.*,
              ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance
       FROM areas_estrategicas ae
       LEFT JOIN objetivos_generales   og ON og.area_id = ae.id
       LEFT JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       LEFT JOIN metas                  m ON m.objetivo_especifico_id = oe.id
       LEFT JOIN indicadores             i ON i.meta_id = m.id AND i.activo = TRUE
       WHERE ae.activo = TRUE ${plan_id ? 'AND ae.plan_id = ?' : ''}
       GROUP BY ae.id
       ORDER BY ae.plan_id, ae.orden`,
      plan_id ? [plan_id] : []
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM areas_estrategicas WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Área no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const create = async (req, res) => {
  try {
    const { plan_id, codigo, nombre, descripcion, orden = 0 } = req.body;
    if (!plan_id || !nombre)
      return res.status(400).json({ success: false, message: 'plan_id y nombre son requeridos' });
    const [r] = await db.query(
      'INSERT INTO areas_estrategicas (plan_id,codigo,nombre,descripcion,orden) VALUES (?,?,?,?,?)',
      [plan_id, codigo, nombre, descripcion, orden]
    );
    res.status(201).json({ success: true, message: 'Área creada', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const update = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, orden, activo } = req.body;
    await db.query(
      'UPDATE areas_estrategicas SET codigo=?,nombre=?,descripcion=?,orden=?,activo=? WHERE id=?',
      [codigo, nombre, descripcion, orden, activo, req.params.id]
    );
    res.json({ success: true, message: 'Área actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const remove = async (req, res) => {
  try {
    await db.query('UPDATE areas_estrategicas SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Área desactivada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove };
