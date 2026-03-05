const db = require('../config/db');

const getDashboard = async (req, res) => {
  try {
    const planId = req.params.plan_id;

    // KPIs globales
    const [kpis] = await db.query(
      `SELECT
         COUNT(DISTINCT ae.id)  AS total_areas,
         COUNT(DISTINCT og.id)  AS total_obj_generales,
         COUNT(DISTINCT oe.id)  AS total_obj_especificos,
         COUNT(DISTINCT m.id)   AS total_metas,
         COUNT(DISTINCT i.id)   AS total_indicadores,
         ROUND(AVG(i.porcentaje_cumplimiento),2) AS avance_global,
         SUM(CASE WHEN i.porcentaje_cumplimiento >= 90 THEN 1 ELSE 0 END) AS indicadores_en_meta,
         SUM(CASE WHEN i.porcentaje_cumplimiento >= 50 AND i.porcentaje_cumplimiento < 90 THEN 1 ELSE 0 END) AS indicadores_en_progreso,
         SUM(CASE WHEN i.porcentaje_cumplimiento < 50 THEN 1 ELSE 0 END) AS indicadores_en_riesgo
       FROM areas_estrategicas ae
       JOIN objetivos_generales og ON og.area_id = ae.id
       JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       JOIN metas m ON m.objetivo_especifico_id = oe.id
       JOIN indicadores i ON i.meta_id = m.id
       WHERE ae.plan_id = ? AND ae.activo=TRUE AND i.activo=TRUE`, [planId]
    );

    // Avance por área estratégica
    const [areas] = await db.query(
      `SELECT ae.id, ae.codigo, ae.nombre,
              ROUND(COALESCE(AVG(i.porcentaje_cumplimiento),0),2) AS avance,
              COUNT(DISTINCT i.id) AS total_indicadores
       FROM areas_estrategicas ae
       JOIN objetivos_generales og ON og.area_id = ae.id
       JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
       JOIN metas m ON m.objetivo_especifico_id = oe.id
       JOIN indicadores i ON i.meta_id = m.id
       WHERE ae.plan_id = ? AND ae.activo=TRUE AND i.activo=TRUE
       GROUP BY ae.id, ae.codigo, ae.nombre
       ORDER BY ae.orden`, [planId]
    );

    // Top 5 indicadores con mayor avance
    const [topIndicadores] = await db.query(
      `SELECT i.id, i.nombre, i.porcentaje_cumplimiento, i.valor_actual, i.valor_meta,
              i.unidad_medida, ae.codigo AS area_codigo
       FROM indicadores i
       JOIN metas m ON m.id = i.meta_id
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE ae.plan_id = ? AND i.activo=TRUE
       ORDER BY i.porcentaje_cumplimiento DESC LIMIT 5`, [planId]
    );

    // Bottom 5 indicadores con menor avance (riesgo)
    const [riesgoIndicadores] = await db.query(
      `SELECT i.id, i.nombre, i.porcentaje_cumplimiento, i.valor_actual, i.valor_meta,
              i.unidad_medida, ae.codigo AS area_codigo
       FROM indicadores i
       JOIN metas m ON m.id = i.meta_id
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE ae.plan_id = ? AND i.activo=TRUE
       ORDER BY i.porcentaje_cumplimiento ASC LIMIT 5`, [planId]
    );

    // Evolución últimos 6 registros del historial (promedio por fecha)
    const [evolucion] = await db.query(
      `SELECT DATE_FORMAT(ih.created_at,'%Y-%m') AS mes,
              ROUND(AVG(ih.porcentaje_cumplimiento),2) AS promedio_cumplimiento
       FROM indicador_historico ih
       JOIN indicadores i ON i.id = ih.indicador_id
       JOIN metas m ON m.id = i.meta_id
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE ae.plan_id = ?
       GROUP BY mes ORDER BY mes DESC LIMIT 12`, [planId]
    );

    res.json({
      success: true,
      data: {
        kpis: kpis[0],
        areas,
        top_indicadores: topIndicadores,
        riesgo_indicadores: riesgoIndicadores,
        evolucion: evolucion.reverse(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getDashboard };
