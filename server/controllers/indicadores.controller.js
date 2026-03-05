const db = require('../config/db');
const { evaluateFormula, calculateCompliance, validateFormula } = require('../utils/formulaEngine');

const getAll = async (req, res) => {
  try {
    const { meta_id, plan_id } = req.query;
    let sql = `SELECT i.*,
                      m.nombre AS meta_nombre, m.unidad_medida AS meta_unidad,
                      oe.nombre AS obj_especifico_nombre,
                      ae.nombre AS area_nombre, ae.plan_id
               FROM indicadores i
               JOIN metas m ON m.id = i.meta_id
               JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
               JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
               JOIN areas_estrategicas ae ON ae.id = og.area_id
               WHERE i.activo = TRUE`;
    const params = [];
    if (meta_id) { sql += ' AND i.meta_id = ?';   params.push(meta_id); }
    if (plan_id) { sql += ' AND ae.plan_id = ?';  params.push(plan_id); }
    sql += ' ORDER BY ae.orden, i.id';

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
      `SELECT i.*, m.nombre AS meta_nombre, m.linea_base AS meta_linea_base,
              oe.nombre AS obj_especifico_nombre, ae.nombre AS area_nombre, ae.plan_id
       FROM indicadores i
       JOIN metas m ON m.id = i.meta_id
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas ae ON ae.id = og.area_id
       WHERE i.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Indicador no encontrado' });

    // Variables disponibles en el plan (cualquiera puede usarse en la fórmula)
    const [vars] = await db.query(
      'SELECT nombre, valor_actual, unidad FROM variables WHERE plan_id = ? AND activo = TRUE ORDER BY nombre',
      [rows[0].plan_id]
    );
    rows[0].variables_disponibles = vars;

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const create = async (req, res) => {
  try {
    const { meta_id, nombre, descripcion, formula, unidad_medida,
            linea_base = 0, valor_meta, periodo_calculo } = req.body;
    if (!meta_id || !nombre || !formula || valor_meta === undefined)
      return res.status(400).json({ success: false, message: 'meta_id, nombre, formula y valor_meta requeridos' });

    const [r] = await db.query(
      `INSERT INTO indicadores (meta_id,nombre,descripcion,formula,unidad_medida,linea_base,valor_meta,periodo_calculo)
       VALUES (?,?,?,?,?,?,?,?)`,
      [meta_id, nombre, descripcion, formula, unidad_medida, linea_base, valor_meta, periodo_calculo]
    );
    res.status(201).json({ success: true, message: 'Indicador creado', id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const update = async (req, res) => {
  try {
    const { nombre, descripcion, formula, unidad_medida, linea_base,
            valor_meta, periodo_calculo, activo } = req.body;
    await db.query(
      `UPDATE indicadores SET nombre=?,descripcion=?,formula=?,unidad_medida=?,
                              linea_base=?,valor_meta=?,periodo_calculo=?,activo=? WHERE id=?`,
      [nombre, descripcion, formula, unidad_medida, linea_base, valor_meta, periodo_calculo, activo, req.params.id]
    );
    res.json({ success: true, message: 'Indicador actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const remove = async (req, res) => {
  try {
    await db.query('UPDATE indicadores SET activo = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Indicador desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const recalculate = async (req, res) => {
  try {
    const indId = req.params.id;

    // Obtener indicador con su plan_id (por jerarquía)
    const [indRows] = await db.query(
      `SELECT i.*, ae.plan_id
       FROM indicadores i
       JOIN metas m ON m.id = i.meta_id
       JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
       JOIN objetivos_generales   og ON og.id = oe.objetivo_general_id
       JOIN areas_estrategicas    ae ON ae.id = og.area_id
       WHERE i.id = ?`, [indId]
    );
    if (!indRows.length)
      return res.status(404).json({ success: false, message: 'Indicador no encontrado' });
    const ind = indRows[0];

    // Scope: TODAS las variables activas del plan (no solo las del indicador)
    const [vars] = await db.query(
      'SELECT nombre, valor_actual FROM variables WHERE plan_id = ? AND activo = TRUE', [ind.plan_id]
    );

    const scope = {};
    vars.forEach(v => { scope[v.nombre] = parseFloat(v.valor_actual) || 0; });

    let valorCalculado = 0;
    try {
      valorCalculado = evaluateFormula(ind.formula, scope);
    } catch (fErr) {
      return res.status(400).json({ success: false, message: fErr.message });
    }

    const pct = calculateCompliance(valorCalculado, ind.valor_meta, ind.linea_base);

    await db.query(
      'UPDATE indicadores SET valor_actual=?, porcentaje_cumplimiento=? WHERE id=?',
      [valorCalculado, pct, indId]
    );

    const { periodo } = req.body;
    await db.query(
      `INSERT INTO indicador_historico (indicador_id,valor_calculado,porcentaje_cumplimiento,periodo,snapshot_variables)
       VALUES (?,?,?,?,?)`,
      [indId, valorCalculado, pct, periodo || null, JSON.stringify(scope)]
    );

    res.json({
      success: true,
      message: 'Indicador recalculado',
      data: { valor_calculado: valorCalculado, porcentaje_cumplimiento: pct },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getHistorico = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM indicador_historico WHERE indicador_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { getAll, getById, create, update, remove, recalculate, getHistorico };
