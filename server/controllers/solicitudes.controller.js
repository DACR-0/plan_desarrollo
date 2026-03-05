const db = require('../config/db');
const { evaluateFormula, calculateCompliance } = require('../utils/formulaEngine');
const path = require('path');

/**
 * Lista solicitudes.
 * Admin ve todas. Usuario de área ve solo las propias.
 */
const getAll = async (req, res) => {
  try {
    const { periodo_id, estado, plan_id } = req.query;
    const esAdmin = req.user.rol === 'admin';

    let sql = `
      SELECT sc.*,
             v.nombre          AS variable_nombre,
             v.unidad          AS variable_unidad,
             v.area_id,
             ae.nombre         AS area_nombre,
             u.nombre          AS usuario_nombre,
             u.email           AS usuario_email,
             ua.nombre         AS aprobado_por_nombre,
             ps.nombre         AS periodo_nombre
      FROM solicitudes_cambio sc
      JOIN variables           v   ON v.id  = sc.variable_id
      LEFT JOIN areas_estrategicas ae ON ae.id = v.area_id
      JOIN periodos_seguimiento   ps  ON ps.id = sc.periodo_id
      JOIN usuarios               u   ON u.id  = sc.usuario_id
      LEFT JOIN usuarios          ua  ON ua.id = sc.aprobado_por
      WHERE 1=1
    `;
    const params = [];

    if (!esAdmin) {
      sql += ' AND sc.usuario_id = ?';
      params.push(req.user.id);
    }
    if (periodo_id) { sql += ' AND sc.periodo_id = ?'; params.push(periodo_id); }
    if (estado)     { sql += ' AND sc.estado = ?';     params.push(estado); }
    if (plan_id)    { sql += ' AND ps.plan_id = ?';    params.push(plan_id); }

    sql += ' ORDER BY sc.fecha_envio DESC';

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
      `SELECT sc.*,
              v.nombre        AS variable_nombre,
              v.unidad        AS variable_unidad,
              v.area_id,
              ae.nombre       AS area_nombre,
              u.nombre        AS usuario_nombre,
              ua.nombre       AS aprobado_por_nombre,
              ps.nombre       AS periodo_nombre,
              ps.estado       AS periodo_estado
       FROM solicitudes_cambio sc
       JOIN variables           v   ON v.id  = sc.variable_id
       LEFT JOIN areas_estrategicas ae ON ae.id = v.area_id
       JOIN periodos_seguimiento   ps  ON ps.id = sc.periodo_id
       JOIN usuarios               u   ON u.id  = sc.usuario_id
       LEFT JOIN usuarios          ua  ON ua.id = sc.aprobado_por
       WHERE sc.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const sol = rows[0];
    // Un usuario de área solo puede ver sus propias solicitudes
    if (req.user.rol === 'area_estrategica' && sol.usuario_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Sin permisos' });

    res.json({ success: true, data: sol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * Crear solicitud de cambio (usuario de área).
 * Requiere un archivo adjunto (ya procesado por multer en la ruta).
 */
const create = async (req, res) => {
  try {
    const { periodo_id, variable_id, valor_propuesto, justificacion } = req.body;

    if (!periodo_id || !variable_id || valor_propuesto === undefined || !justificacion)
      return res.status(400).json({
        success: false,
        message: 'periodo_id, variable_id, valor_propuesto y justificacion son requeridos'
      });

    if (!req.file)
      return res.status(400).json({ success: false, message: 'El documento soporte es obligatorio' });

    // 1. Verificar que el período existe y está activo
    const [periodos] = await db.query(
      "SELECT * FROM periodos_seguimiento WHERE id = ? AND estado = 'activo'",
      [periodo_id]
    );
    if (!periodos.length)
      return res.status(400).json({
        success: false,
        message: 'No existe un período de seguimiento activo con ese ID'
      });

    const periodo = periodos[0];

    // 2. Verificar que la fecha actual está dentro del rango
    const hoy       = new Date().toISOString().slice(0, 10);
    const fiInicio  = new Date(periodo.fecha_inicio).toISOString().slice(0, 10);
    const fiCierre  = new Date(periodo.fecha_cierre).toISOString().slice(0, 10);
    if (hoy < fiInicio || hoy > fiCierre)
      return res.status(400).json({
        success: false,
        message: 'El período de reporte está fuera de las fechas habilitadas'
      });

    // 3. Verificar que la variable pertenece al plan del período
    const [vars] = await db.query(
      'SELECT * FROM variables WHERE id = ? AND plan_id = ? AND activo = TRUE',
      [variable_id, periodo.plan_id]
    );
    if (!vars.length)
      return res.status(404).json({ success: false, message: 'Variable no encontrada en este plan' });

    const variable = vars[0];

    // 4. Si el usuario es 'area_estrategica', verificar que tiene asignada el área de la variable
    if (req.user.rol === 'area_estrategica') {
      if (!variable.area_id)
        return res.status(403).json({
          success: false,
          message: 'Esta variable no tiene un área asignada; no puede ser reportada'
        });

      const [asignacion] = await db.query(
        'SELECT id FROM usuario_area WHERE usuario_id = ? AND area_id = ?',
        [req.user.id, variable.area_id]
      );
      if (!asignacion.length)
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para reportar variables de esta área'
        });
    }

    // 5. Verificar que no haya ya una solicitud pendiente para la misma variable en el mismo período
    const [pendientes] = await db.query(
      "SELECT id FROM solicitudes_cambio WHERE periodo_id = ? AND variable_id = ? AND estado = 'pendiente'",
      [periodo_id, variable_id]
    );
    if (pendientes.length)
      return res.status(409).json({
        success: false,
        message: 'Ya existe una solicitud pendiente para esta variable en el período actual'
      });

    // 6. Crear la solicitud
    const documentoUrl    = req.file.filename;
    const documentoNombre = req.file.originalname;
    const valorAnterior   = variable.valor_actual;

    const [r] = await db.query(
      `INSERT INTO solicitudes_cambio
         (periodo_id, variable_id, usuario_id, valor_anterior, valor_propuesto,
          justificacion, documento_url, documento_nombre)
       VALUES (?,?,?,?,?,?,?,?)`,
      [periodo_id, variable_id, req.user.id, valorAnterior,
       valor_propuesto, justificacion, documentoUrl, documentoNombre]
    );

    res.status(201).json({
      success: true,
      message: 'Solicitud de cambio enviada correctamente',
      id: r.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Aprobar una solicitud (admin) */
const aprobar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { observacion } = req.body;

    const [rows] = await conn.query(
      `SELECT sc.*, v.plan_id, v.nombre AS var_nombre, ps.nombre AS periodo_nombre
       FROM solicitudes_cambio sc
       JOIN variables           v  ON v.id  = sc.variable_id
       JOIN periodos_seguimiento ps ON ps.id = sc.periodo_id
       WHERE sc.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const sol = rows[0];
    if (sol.estado !== 'pendiente')
      return res.status(400).json({ success: false, message: 'La solicitud ya fue resuelta' });

    await conn.beginTransaction();

    // 1. Actualizar estado de la solicitud
    await conn.query(
      `UPDATE solicitudes_cambio
       SET estado = 'aprobado', aprobado_por = ?, observacion_admin = ?,
           fecha_resolucion = NOW()
       WHERE id = ?`,
      [req.user.id, observacion || null, req.params.id]
    );

    // 2. Actualizar valor de la variable
    await conn.query(
      'UPDATE variables SET valor_actual = ? WHERE id = ?',
      [sol.valor_propuesto, sol.variable_id]
    );

    // 3. Registrar en historial de variable
    await conn.query(
      `INSERT INTO variable_historico
         (variable_id, valor, periodo, usuario_id, observacion)
       VALUES (?,?,?,?,?)`,
      [
        sol.variable_id,
        sol.valor_propuesto,
        sol.periodo_nombre,
        req.user.id,
        `Aprobado desde solicitud #${sol.id}. ${observacion || ''}`
      ]
    );

    // 4. Recalcular todos los indicadores del plan
    const planId = sol.plan_id;
    const [allVars] = await conn.query(
      'SELECT nombre, valor_actual FROM variables WHERE plan_id = ? AND activo = TRUE',
      [planId]
    );
    const scope = {};
    allVars.forEach(vr => { scope[vr.nombre] = parseFloat(vr.valor_actual) || 0; });
    // Aplicar el nuevo valor inmediatamente en el scope
    scope[sol.var_nombre] = parseFloat(sol.valor_propuesto) || 0;

    const [inds] = await conn.query(
      `SELECT i.* FROM indicadores i
       JOIN metas                  m  ON m.id  = i.meta_id
       JOIN objetivos_especificos  oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales    og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas     ae ON ae.id = og.area_id
       WHERE ae.plan_id = ? AND i.activo = TRUE`,
      [planId]
    );

    const { evaluateFormula: evalF, calculateCompliance: calcC } = require('../utils/formulaEngine');

    for (const ind of inds) {
      let valorCalculado = 0;
      try { valorCalculado = evalF(ind.formula, scope); } catch { /* mantener 0 */ }
      const pct = calcC(valorCalculado, ind.valor_meta, ind.linea_base);
      await conn.query(
        'UPDATE indicadores SET valor_actual=?, porcentaje_cumplimiento=? WHERE id=?',
        [valorCalculado, pct, ind.id]
      );
      await conn.query(
        `INSERT INTO indicador_historico
           (indicador_id, valor_calculado, porcentaje_cumplimiento, periodo, snapshot_variables)
         VALUES (?,?,?,?,?)`,
        [ind.id, valorCalculado, pct, sol.periodo_nombre, JSON.stringify(scope)]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Solicitud aprobada y variable actualizada' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

/** Rechazar una solicitud (admin) */
const rechazar = async (req, res) => {
  try {
    const { observacion } = req.body;
    if (!observacion)
      return res.status(400).json({ success: false, message: 'La observación es requerida para rechazar' });

    const [rows] = await db.query(
      'SELECT * FROM solicitudes_cambio WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (rows[0].estado !== 'pendiente')
      return res.status(400).json({ success: false, message: 'La solicitud ya fue resuelta' });

    await db.query(
      `UPDATE solicitudes_cambio
       SET estado = 'rechazado', aprobado_por = ?, observacion_admin = ?,
           fecha_resolucion = NOW()
       WHERE id = ?`,
      [req.user.id, observacion, req.params.id]
    );
    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, aprobar, rechazar };
