const db = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { oe_id, plan_id } = req.query;
    let sql = `SELECT m.*,
                      oe.nombre AS obj_especifico_nombre,
                      og.nombre AS obj_general_nombre,
                      ae.nombre AS area_nombre, ae.plan_id,
                      ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance
               FROM metas m
               JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
               JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
               JOIN areas_estrategicas ae ON ae.id = og.area_id
               LEFT JOIN indicadores i ON i.meta_id = m.id AND i.activo = TRUE
               WHERE m.activo = TRUE`;
    const params = [];
    if (oe_id)   { sql += ' AND m.objetivo_especifico_id = ?'; params.push(oe_id); }
    if (plan_id) { sql += ' AND ae.plan_id = ?';               params.push(plan_id); }
    sql += ' GROUP BY m.id ORDER BY m.objetivo_especifico_id, m.orden';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, oe.nombre AS obj_especifico_nombre, og.nombre AS obj_general_nombre, ae.nombre AS area_nombre
       FROM metas m
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE m.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meta no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const create = async (req, res) => {
  try {
    const { objetivo_especifico_id, codigo, nombre, descripcion, linea_base = 0,
            valor_meta, unidad_medida, anio_meta, orden = 0 } = req.body;
    if (!objetivo_especifico_id || !nombre || valor_meta === undefined)
      return res.status(400).json({ success: false, message: 'objetivo_especifico_id, nombre y valor_meta requeridos' });

    const [r] = await db.query(
      `INSERT INTO metas
         (objetivo_especifico_id,codigo,nombre,descripcion,linea_base,valor_meta,unidad_medida,anio_meta,orden)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [objetivo_especifico_id, codigo, nombre, descripcion, linea_base, valor_meta, unidad_medida, anio_meta, orden]
    );
    res.status(201).json({ success: true, message: 'Meta creada', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const update = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, linea_base, valor_meta, unidad_medida, anio_meta, orden, activo } = req.body;
    await db.query(
      `UPDATE metas SET codigo=?,nombre=?,descripcion=?,linea_base=?,valor_meta=?,
                        unidad_medida=?,anio_meta=?,orden=?,activo=? WHERE id=?`,
      [codigo, nombre, descripcion, linea_base, valor_meta, unidad_medida, anio_meta, orden, activo, req.params.id]
    );
    res.json({ success: true, message: 'Meta actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const remove = async (req, res) => {
  try {
    await db.query('UPDATE metas SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Meta desactivada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove };
