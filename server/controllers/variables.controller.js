const db = require('../config/db');
const { evaluateFormula, calculateCompliance } = require('../utils/formulaEngine');

/** Listar variables, opcionalmente filtradas por plan */
const getAll = async (req, res) => {
  try {
    const { plan_id } = req.query;
    let sql = 'SELECT * FROM variables WHERE activo = TRUE';
    const params = [];
    if (plan_id) { sql += ' AND plan_id = ?'; params.push(plan_id); }
    sql += ' ORDER BY nombre';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM variables WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Variable no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/** Crear variable vinculada a un plan (sin indicador_id obligatorio) */
const create = async (req, res) => {
  try {
    const { plan_id, nombre, descripcion, valor_actual = 0, unidad } = req.body;
    if (!plan_id || !nombre)
      return res.status(400).json({ success: false, message: 'plan_id y nombre son requeridos' });
    const [r] = await db.query(
      'INSERT INTO variables (plan_id, nombre, descripcion, valor_actual, unidad) VALUES (?,?,?,?,?)',
      [plan_id, nombre, descripcion, valor_actual, unidad]
    );
    res.status(201).json({ success: true, message: 'Variable creada', id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success: false, message: 'Ya existe una variable con ese nombre en este plan' });
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const update = async (req, res) => {
  try {
    const { nombre, descripcion, valor_actual, unidad, activo } = req.body;
    const [old] = await db.query('SELECT * FROM variables WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, message: 'Variable no encontrada' });

    await db.query(
      'UPDATE variables SET nombre=?,descripcion=?,valor_actual=?,unidad=?,activo=? WHERE id=?',
      [nombre, descripcion, valor_actual, unidad, activo, req.params.id]
    );

    if (parseFloat(old[0].valor_actual) !== parseFloat(valor_actual)) {
      await db.query(
        'INSERT INTO variable_historico (variable_id,valor,periodo,usuario_id,observacion) VALUES (?,?,?,?,?)',
        [req.params.id, valor_actual, req.body.periodo || null, req.user.id, req.body.observacion || null]
      );
    }

    res.json({ success: true, message: 'Variable actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const remove = async (req, res) => {
  try {
    await db.query('UPDATE variables SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Variable desactivada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * Actualiza múltiples variables y recalcula TODOS los indicadores
 * del plan afectado (ya que cualquier indicador puede usar cualquier variable).
 */
const updateBatch = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { variables, periodo, observacion } = req.body;
    if (!Array.isArray(variables) || !variables.length)
      return res.status(400).json({ success: false, message: 'variables[] requerido' });

    await conn.beginTransaction();

    const planIds = new Set();

    // Actualizar valores y registrar historial
    for (const v of variables) {
      const [rows] = await conn.query('SELECT * FROM variables WHERE id = ?', [v.id]);
      if (!rows.length) continue;
      const old = rows[0];

      await conn.query('UPDATE variables SET valor_actual = ? WHERE id = ?', [v.valor_actual, v.id]);

      if (parseFloat(old.valor_actual) !== parseFloat(v.valor_actual)) {
        await conn.query(
          'INSERT INTO variable_historico (variable_id,valor,periodo,usuario_id,observacion) VALUES (?,?,?,?,?)',
          [v.id, v.valor_actual, periodo || null, req.user.id, observacion || null]
        );
      }
      if (old.plan_id) planIds.add(old.plan_id);
    }

    // Recalcular todos los indicadores de los planes afectados
    const resultados = [];
    for (const planId of planIds) {
      // Scope completo: todas las variables del plan con sus valores actualizados
      const [allVars] = await conn.query(
        'SELECT nombre, valor_actual FROM variables WHERE plan_id = ? AND activo = TRUE', [planId]
      );
      const scope = {};
      allVars.forEach(vr => { scope[vr.nombre] = parseFloat(vr.valor_actual) || 0; });

      // Todos los indicadores activos del plan
      const [inds] = await conn.query(
        `SELECT i.* FROM indicadores i
         JOIN metas m ON m.id = i.meta_id
         JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
         JOIN objetivos_generales   og ON og.id = oe.objetivo_general_id
         JOIN areas_estrategicas    ae ON ae.id = og.area_id
         WHERE ae.plan_id = ? AND i.activo = TRUE`, [planId]
      );

      for (const ind of inds) {
        let valorCalculado = 0;
        try { valorCalculado = evaluateFormula(ind.formula, scope); } catch { /* mantener 0 */ }
        const pct = calculateCompliance(valorCalculado, ind.valor_meta, ind.linea_base);

        await conn.query(
          'UPDATE indicadores SET valor_actual=?, porcentaje_cumplimiento=? WHERE id=?',
          [valorCalculado, pct, ind.id]
        );
        await conn.query(
          'INSERT INTO indicador_historico (indicador_id,valor_calculado,porcentaje_cumplimiento,periodo,snapshot_variables) VALUES (?,?,?,?,?)',
          [ind.id, valorCalculado, pct, periodo || null, JSON.stringify(scope)]
        );
        resultados.push({ indicador_id: ind.id, valor_calculado: valorCalculado, porcentaje_cumplimiento: pct });
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Variables actualizadas e indicadores recalculados', data: resultados });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    conn.release();
  }
};

const getHistorico = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT vh.*, u.nombre AS usuario_nombre
       FROM variable_historico vh
       LEFT JOIN usuarios u ON u.id = vh.usuario_id
       WHERE vh.variable_id = ?
       ORDER BY vh.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove, updateBatch, getHistorico };
