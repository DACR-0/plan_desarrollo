const math = require('mathjs');

/**
 * Evalúa una fórmula matemática con los valores de las variables dadas.
 * @param {string} formula  - Expresión matemática (ej: "(V1 / V2) * 100")
 * @param {Object} variables - { nombre_variable: valor_numerico }
 * @returns {number}
 */
function evaluateFormula(formula, variables) {
  const scope = {};
  Object.entries(variables).forEach(([k, v]) => {
    scope[k] = parseFloat(v) || 0;
  });

  try {
    const result = math.evaluate(formula, scope);
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return parseFloat(result.toFixed(4));
  } catch (err) {
    throw new Error(`Error en fórmula "${formula}": ${err.message}`);
  }
}

/**
 * Calcula el porcentaje de cumplimiento de un indicador.
 * Soporta indicadores directos (meta alta) e inversos (meta baja).
 * @param {number} actual
 * @param {number} meta
 * @param {number} lineaBase
 * @returns {number}  porcentaje entre 0 y 200 (puede superar 100 si se excede la meta)
 */
function calculateCompliance(actual, meta, lineaBase = 0) {
  const a = parseFloat(actual)    || 0;
  const m = parseFloat(meta)      || 0;
  const l = parseFloat(lineaBase) || 0;

  if (m === 0) return 0;

  const range    = m - l;
  const progress = a - l;

  if (range === 0) return a >= m ? 100 : 0;

  const pct = (progress / range) * 100;
  return parseFloat(Math.max(0, pct).toFixed(2));
}

/**
 * Estado semafórico según porcentaje de cumplimiento.
 */
function getStatus(pct) {
  if (pct >= 90) return 'en_meta';
  if (pct >= 50) return 'en_progreso';
  return 'en_riesgo';
}

/**
 * Valida que una fórmula sea evaluable con los nombres de variable dados.
 */
function validateFormula(formula, varNames = []) {
  const scope = {};
  varNames.forEach(n => { scope[n] = 1; });
  try {
    math.evaluate(formula, scope);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { evaluateFormula, calculateCompliance, getStatus, validateFormula };
