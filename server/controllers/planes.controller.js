const db = require('../config/db');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*,
              u.nombre AS created_by_nombre,
              (SELECT COUNT(*) FROM areas_estrategicas WHERE plan_id = p.id AND activo = TRUE) AS total_areas
       FROM planes p
       LEFT JOIN usuarios u ON u.id = p.created_by
       WHERE p.activo = TRUE
       ORDER BY p.vigente DESC, p.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.nombre AS created_by_nombre
       FROM planes p LEFT JOIN usuarios u ON u.id = p.created_by
       WHERE p.id = ?`, [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Plan no encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, descripcion, anio_inicio, anio_fin } = req.body;
    if (!nombre || !anio_inicio || !anio_fin)
      return res.status(400).json({ success: false, message: 'Campos requeridos: nombre, anio_inicio, anio_fin' });

    const [r] = await db.query(
      'INSERT INTO planes (nombre,descripcion,anio_inicio,anio_fin,vigente,created_by) VALUES (?,?,?,?,FALSE,?)',
      [nombre, descripcion, anio_inicio, anio_fin, req.user.id]
    );
    res.status(201).json({ success: true, message: 'Plan creado', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const update = async (req, res) => {
  try {
    const { nombre, descripcion, anio_inicio, anio_fin, activo } = req.body;
    await db.query(
      'UPDATE planes SET nombre=?,descripcion=?,anio_inicio=?,anio_fin=?,activo=? WHERE id=?',
      [nombre, descripcion, anio_inicio, anio_fin, activo, req.params.id]
    );
    res.json({ success: true, message: 'Plan actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const remove = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT vigente FROM planes WHERE id = ?', [req.params.id]);
    if (rows[0]?.vigente)
      return res.status(400).json({ success: false, message: 'No se puede eliminar el plan activo. Activa otro plan primero.' });
    await db.query('UPDATE planes SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Plan desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Marca un plan como vigente y desactiva todos los demás */
const activar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE planes SET vigente = FALSE WHERE activo = TRUE');
    const [r] = await conn.query(
      'UPDATE planes SET vigente = TRUE WHERE id = ? AND activo = TRUE', [req.params.id]
    );
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Plan no encontrado o inactivo' });
    }
    await conn.commit();
    res.json({ success: true, message: 'Plan activado exitosamente' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

const getEstructura = async (req, res) => {
  try {
    const planId = req.params.id;

    const [areas] = await db.query(
      'SELECT * FROM areas_estrategicas WHERE plan_id = ? AND activo = TRUE ORDER BY orden', [planId]
    );

    for (const area of areas) {
      const [ogs] = await db.query(
        'SELECT * FROM objetivos_generales WHERE area_id = ? AND activo = TRUE ORDER BY orden', [area.id]
      );
      for (const og of ogs) {
        const [oes] = await db.query(
          'SELECT * FROM objetivos_especificos WHERE objetivo_general_id = ? AND activo = TRUE ORDER BY orden', [og.id]
        );
        for (const oe of oes) {
          const [metas] = await db.query(
            'SELECT * FROM metas WHERE objetivo_especifico_id = ? AND activo = TRUE ORDER BY orden', [oe.id]
          );
          for (const meta of metas) {
            const [indicadores] = await db.query(
              'SELECT * FROM indicadores WHERE meta_id = ? AND activo = TRUE', [meta.id]
            );
            for (const ind of indicadores) {
              const [vars] = await db.query(
                'SELECT * FROM variables WHERE indicador_id = ? AND activo = TRUE', [ind.id]
              );
              ind.variables = vars;
            }
            meta.indicadores = indicadores;
          }
          oe.metas = metas;
        }
        og.objetivos_especificos = oes;
      }
      area.objetivos_generales = ogs;
    }

    res.json({ success: true, data: areas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const planId = req.params.id;

    const [areas] = await db.query(
      `SELECT ae.id, ae.codigo, ae.nombre,
              ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance,
              COUNT(DISTINCT i.id) AS total_indicadores
       FROM areas_estrategicas ae
       JOIN objetivos_generales   og ON og.area_id = ae.id
       JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       JOIN metas                  m ON m.objetivo_especifico_id = oe.id
       JOIN indicadores             i ON i.meta_id = m.id
       WHERE ae.plan_id = ? AND ae.activo = TRUE AND i.activo = TRUE
       GROUP BY ae.id, ae.codigo, ae.nombre
       ORDER BY ae.orden`, [planId]
    );

    const [kpis] = await db.query(
      `SELECT
         COUNT(DISTINCT ae.id) AS total_areas,
         COUNT(DISTINCT og.id) AS total_obj_generales,
         COUNT(DISTINCT oe.id) AS total_obj_especificos,
         COUNT(DISTINCT m.id)  AS total_metas,
         COUNT(DISTINCT i.id)  AS total_indicadores,
         ROUND(AVG(i.porcentaje_cumplimiento),2) AS avance_global
       FROM areas_estrategicas ae
       JOIN objetivos_generales   og ON og.area_id = ae.id
       JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       JOIN metas                  m ON m.objetivo_especifico_id = oe.id
       JOIN indicadores             i ON i.meta_id = m.id
       WHERE ae.plan_id = ? AND ae.activo = TRUE AND i.activo = TRUE`, [planId]
    );

    const [indicadoresPorEstado] = await db.query(
      `SELECT
         SUM(CASE WHEN i.porcentaje_cumplimiento >= 90 THEN 1 ELSE 0 END) AS en_meta,
         SUM(CASE WHEN i.porcentaje_cumplimiento >= 50 AND i.porcentaje_cumplimiento < 90 THEN 1 ELSE 0 END) AS en_progreso,
         SUM(CASE WHEN i.porcentaje_cumplimiento < 50 THEN 1 ELSE 0 END) AS en_riesgo
       FROM areas_estrategicas ae
       JOIN objetivos_generales   og ON og.area_id = ae.id
       JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       JOIN metas                  m ON m.objetivo_especifico_id = oe.id
       JOIN indicadores             i ON i.meta_id = m.id
       WHERE ae.plan_id = ? AND ae.activo = TRUE AND i.activo = TRUE`, [planId]
    );

    res.json({
      success: true,
      data: {
        kpis: kpis[0],
        areas,
        indicadores_por_estado: indicadoresPorEstado[0],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove, activar, getEstructura, getDashboard };
