const db = require('../config/db');

// ── Objetivos Generales ────────────────────────────────────

const getAllGenerales = async (req, res) => {
  try {
    const { area_id, plan_id } = req.query;
    let sql = `SELECT og.*,
                      ae.nombre AS area_nombre, ae.plan_id,
                      ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance
               FROM objetivos_generales og
               JOIN areas_estrategicas ae ON ae.id = og.area_id
               LEFT JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
               LEFT JOIN metas m ON m.objetivo_especifico_id = oe.id
               LEFT JOIN indicadores i ON i.meta_id = m.id AND i.activo = TRUE
               WHERE og.activo = TRUE`;
    const params = [];
    if (area_id) { sql += ' AND og.area_id = ?'; params.push(area_id); }
    if (plan_id) { sql += ' AND ae.plan_id = ?'; params.push(plan_id); }
    sql += ' GROUP BY og.id ORDER BY og.area_id, og.orden';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getGeneralById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT og.*, ae.nombre AS area_nombre FROM objetivos_generales og JOIN areas_estrategicas ae ON ae.id = og.area_id WHERE og.id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const createGeneral = async (req, res) => {
  try {
    const { area_id, codigo, nombre, descripcion, orden = 0 } = req.body;
    if (!area_id || !nombre)
      return res.status(400).json({ success: false, message: 'area_id y nombre requeridos' });
    const [r] = await db.query(
      'INSERT INTO objetivos_generales (area_id,codigo,nombre,descripcion,orden) VALUES (?,?,?,?,?)',
      [area_id, codigo, nombre, descripcion, orden]
    );
    res.status(201).json({ success: true, message: 'Objetivo general creado', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const updateGeneral = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, orden, activo } = req.body;
    await db.query(
      'UPDATE objetivos_generales SET codigo=?,nombre=?,descripcion=?,orden=?,activo=? WHERE id=?',
      [codigo, nombre, descripcion, orden, activo, req.params.id]
    );
    res.json({ success: true, message: 'Objetivo general actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const removeGeneral = async (req, res) => {
  try {
    await db.query('UPDATE objetivos_generales SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Objetivo general desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ── Objetivos Específicos ─────────────────────────────────

const getAllEspecificos = async (req, res) => {
  try {
    const { og_id, area_id, plan_id } = req.query;
    let sql = `SELECT oe.*,
                      og.nombre AS objetivo_general_nombre,
                      ae.id AS area_id, ae.nombre AS area_nombre, ae.plan_id,
                      ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance
               FROM objetivos_especificos oe
               JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
               JOIN areas_estrategicas ae ON ae.id = og.area_id
               LEFT JOIN metas m ON m.objetivo_especifico_id = oe.id
               LEFT JOIN indicadores i ON i.meta_id = m.id AND i.activo = TRUE
               WHERE oe.activo = TRUE`;
    const params = [];
    if (og_id)   { sql += ' AND oe.objetivo_general_id = ?'; params.push(og_id); }
    if (area_id) { sql += ' AND og.area_id = ?';             params.push(area_id); }
    if (plan_id) { sql += ' AND ae.plan_id = ?';             params.push(plan_id); }
    sql += ' GROUP BY oe.id ORDER BY oe.objetivo_general_id, oe.orden';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getEspecificoById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT oe.*, og.nombre AS objetivo_general_nombre, ae.nombre AS area_nombre
       FROM objetivos_especificos oe
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE oe.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const createEspecifico = async (req, res) => {
  try {
    const { objetivo_general_id, codigo, nombre, descripcion, orden = 0 } = req.body;
    if (!objetivo_general_id || !nombre)
      return res.status(400).json({ success: false, message: 'objetivo_general_id y nombre requeridos' });
    const [r] = await db.query(
      'INSERT INTO objetivos_especificos (objetivo_general_id,codigo,nombre,descripcion,orden) VALUES (?,?,?,?,?)',
      [objetivo_general_id, codigo, nombre, descripcion, orden]
    );
    res.status(201).json({ success: true, message: 'Objetivo específico creado', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const updateEspecifico = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, orden, activo } = req.body;
    await db.query(
      'UPDATE objetivos_especificos SET codigo=?,nombre=?,descripcion=?,orden=?,activo=? WHERE id=?',
      [codigo, nombre, descripcion, orden, activo, req.params.id]
    );
    res.json({ success: true, message: 'Objetivo específico actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const removeEspecifico = async (req, res) => {
  try {
    await db.query('UPDATE objetivos_especificos SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Objetivo específico desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  getAllGenerales, getGeneralById, createGeneral, updateGeneral, removeGeneral,
  getAllEspecificos, getEspecificoById, createEspecifico, updateEspecifico, removeEspecifico,
};
