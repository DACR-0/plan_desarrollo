-- ============================================================
-- MIGRACIÓN: añadir columna "vigente" a la tabla planes
-- Ejecutar solo si ya tienes la BD creada desde database.sql
-- ============================================================

ALTER TABLE planes
  ADD COLUMN vigente BOOLEAN NOT NULL DEFAULT FALSE;

-- Activar el plan con menor id como plan vigente inicial
UPDATE planes
SET vigente = TRUE
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM planes WHERE activo = TRUE) t);

-- Verificar
SELECT id, nombre, anio_inicio, anio_fin, activo, vigente FROM planes;

-- ============================================================
-- MIGRACIÓN 2: desacoplar variables de indicadores
-- Las variables pasan a ser de ámbito de plan (plan_id).
-- ============================================================

-- 1. Agregar columna plan_id a variables
ALTER TABLE variables ADD COLUMN plan_id INT AFTER indicador_id;

-- 2. Poblar plan_id derivándolo de la jerarquía actual
UPDATE variables v
JOIN indicadores i  ON i.id  = v.indicador_id
JOIN metas m        ON m.id  = i.meta_id
JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
JOIN objetivos_generales   og ON og.id = oe.objetivo_general_id
JOIN areas_estrategicas    ae ON ae.id = og.area_id
SET v.plan_id = ae.plan_id;

-- 3. Hacer indicador_id nullable (las nuevas variables ya no lo requieren)
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE variables MODIFY COLUMN indicador_id INT NULL;
SET FOREIGN_KEY_CHECKS = 1;

-- 4. Eliminar duplicados (mismo plan_id + nombre); conservar el de id más bajo
SET SQL_SAFE_UPDATES = 0;
DELETE v1 FROM variables v1
INNER JOIN variables v2
  ON  v1.plan_id = v2.plan_id
  AND v1.nombre  = v2.nombre
  AND v1.id      > v2.id;
SET SQL_SAFE_UPDATES = 1;

-- 5. Índice único por plan + nombre de variable
ALTER TABLE variables ADD UNIQUE KEY uk_var_plan_nombre (plan_id, nombre);

-- Verificar
SELECT id, plan_id, indicador_id, nombre, valor_actual FROM variables LIMIT 20;
