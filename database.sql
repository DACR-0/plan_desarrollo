-- ============================================================
-- SIGEPU – Sistema de Gestión del Plan de Desarrollo Universitario
-- Base de Datos MySQL  |  Versión 1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS sigepu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sigepu;

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT           PRIMARY KEY AUTO_INCREMENT,
  nombre        VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           ENUM('admin','consultor') NOT NULL DEFAULT 'consultor',
  activo        BOOLEAN       DEFAULT TRUE,
  ultimo_acceso TIMESTAMP     NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planes (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  nombre      VARCHAR(500)  NOT NULL,
  descripcion TEXT,
  anio_inicio INT           NOT NULL,
  anio_fin    INT           NOT NULL,
  activo      BOOLEAN       DEFAULT TRUE,
  vigente     BOOLEAN       DEFAULT FALSE COMMENT 'Plan actualmente seleccionado en el sistema',
  created_by  INT,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS areas_estrategicas (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  plan_id     INT           NOT NULL,
  codigo      VARCHAR(30),
  nombre      VARCHAR(500)  NOT NULL,
  descripcion TEXT,
  orden       INT           DEFAULT 0,
  activo      BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objetivos_generales (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  area_id     INT           NOT NULL,
  codigo      VARCHAR(40),
  nombre      VARCHAR(500)  NOT NULL,
  descripcion TEXT,
  orden       INT           DEFAULT 0,
  activo      BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES areas_estrategicas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objetivos_especificos (
  id                   INT           PRIMARY KEY AUTO_INCREMENT,
  objetivo_general_id  INT           NOT NULL,
  codigo               VARCHAR(50),
  nombre               VARCHAR(500)  NOT NULL,
  descripcion          TEXT,
  orden                INT           DEFAULT 0,
  activo               BOOLEAN       DEFAULT TRUE,
  created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (objetivo_general_id) REFERENCES objetivos_generales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metas (
  id                      INT             PRIMARY KEY AUTO_INCREMENT,
  objetivo_especifico_id  INT             NOT NULL,
  codigo                  VARCHAR(60),
  nombre                  VARCHAR(500)    NOT NULL,
  descripcion             TEXT,
  linea_base              DECIMAL(15,4)   DEFAULT 0,
  valor_meta              DECIMAL(15,4)   NOT NULL,
  unidad_medida           VARCHAR(100),
  anio_meta               INT,
  orden                   INT             DEFAULT 0,
  activo                  BOOLEAN         DEFAULT TRUE,
  created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (objetivo_especifico_id) REFERENCES objetivos_especificos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS indicadores (
  id                     INT            PRIMARY KEY AUTO_INCREMENT,
  meta_id                INT            NOT NULL,
  nombre                 VARCHAR(500)   NOT NULL,
  descripcion            TEXT,
  formula                TEXT           NOT NULL COMMENT 'Fórmula usando nombres de variables',
  unidad_medida          VARCHAR(100),
  linea_base             DECIMAL(15,4)  DEFAULT 0,
  valor_meta             DECIMAL(15,4)  NOT NULL,
  valor_actual           DECIMAL(15,4)  DEFAULT 0,
  porcentaje_cumplimiento DECIMAL(7,2)  DEFAULT 0,
  periodo_calculo        VARCHAR(50)    COMMENT 'anual, semestral, trimestral',
  activo                 BOOLEAN        DEFAULT TRUE,
  created_at             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (meta_id) REFERENCES metas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS variables (
  id           INT            PRIMARY KEY AUTO_INCREMENT,
  plan_id      INT            NOT NULL COMMENT 'Pertenece al plan; puede usarse en cualquier indicador del mismo plan',
  indicador_id INT            NULL       COMMENT 'Obsoleto, mantenido por compatibilidad',
  nombre       VARCHAR(100)   NOT NULL   COMMENT 'Nombre sin espacios, referenciado en fórmulas',
  descripcion  TEXT,
  valor_actual DECIMAL(15,4)  DEFAULT 0,
  unidad       VARCHAR(100),
  activo       BOOLEAN        DEFAULT TRUE,
  created_at   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_var_plan_nombre (plan_id, nombre)
);

CREATE TABLE IF NOT EXISTS variable_historico (
  id          INT            PRIMARY KEY AUTO_INCREMENT,
  variable_id INT            NOT NULL,
  valor       DECIMAL(15,4)  NOT NULL,
  periodo     VARCHAR(100),
  usuario_id  INT,
  observacion TEXT,
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS indicador_historico (
  id                      INT            PRIMARY KEY AUTO_INCREMENT,
  indicador_id            INT            NOT NULL,
  valor_calculado         DECIMAL(15,4),
  porcentaje_cumplimiento DECIMAL(7,2),
  periodo                 VARCHAR(100),
  snapshot_variables      JSON           COMMENT 'Copia de variables al momento del cálculo',
  created_at              TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicador_id) REFERENCES indicadores(id) ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_planes_activo       ON planes(activo);
CREATE INDEX idx_areas_plan          ON areas_estrategicas(plan_id);
CREATE INDEX idx_og_area             ON objetivos_generales(area_id);
CREATE INDEX idx_oe_og               ON objetivos_especificos(objetivo_general_id);
CREATE INDEX idx_metas_oe            ON metas(objetivo_especifico_id);
CREATE INDEX idx_ind_meta            ON indicadores(meta_id);
CREATE INDEX idx_vars_ind            ON variables(indicador_id);
CREATE INDEX idx_var_hist_var        ON variable_historico(variable_id, created_at);
CREATE INDEX idx_ind_hist_ind        ON indicador_historico(indicador_id, created_at);

-- ============================================================
-- VISTA: avance consolidado por área
-- ============================================================

CREATE OR REPLACE VIEW v_avance_areas AS
SELECT
  ae.id              AS area_id,
  ae.plan_id,
  ae.codigo          AS area_codigo,
  ae.nombre          AS area_nombre,
  ROUND(AVG(i.porcentaje_cumplimiento), 2) AS avance_promedio,
  COUNT(i.id)        AS total_indicadores
FROM areas_estrategicas ae
  JOIN objetivos_generales   og ON og.area_id = ae.id
  JOIN objetivos_especificos oe ON oe.objetivo_general_id = og.id
  JOIN metas                  m ON m.objetivo_especifico_id = oe.id
  JOIN indicadores             i ON i.meta_id = m.id
WHERE ae.activo = TRUE AND i.activo = TRUE
GROUP BY ae.id, ae.plan_id, ae.codigo, ae.nombre;

-- ============================================================
-- DATOS INICIALES (SEED)
-- Contraseña para todos: Admin123!
-- Hash bcrypt (cost=10) de "Admin123!"
-- ============================================================

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador Sistema', 'admin@universidad.edu',
   '$2a$10$dMVKXkZFPDbXjW5RSl7P1OJhwwg7Ohw5GEA9lWpDpQghJK3V4DXp6', 'admin'),
  ('María López',           'm.lopez@universidad.edu',
   '$2a$10$dMVKXkZFPDbXjW5RSl7P1OJhwwg7Ohw5GEA9lWpDpQghJK3V4DXp6', 'consultor'),
  ('Carlos Ramírez',        'c.ramirez@universidad.edu',
   '$2a$10$dMVKXkZFPDbXjW5RSl7P1OJhwwg7Ohw5GEA9lWpDpQghJK3V4DXp6', 'admin');

INSERT INTO planes (nombre, descripcion, anio_inicio, anio_fin, vigente, created_by) VALUES
  ('Plan de Desarrollo Institucional 2022-2026',
   'Plan estratégico de la institución para el período 2022-2026, orientado al fortalecimiento de la docencia, investigación, extensión, gestión y bienestar universitario.',
   2022, 2026, TRUE, 1);

INSERT INTO areas_estrategicas (plan_id, codigo, nombre, descripcion, orden) VALUES
  (1, 'AE1', 'Docencia de Calidad',            'Fortalecimiento de los procesos de enseñanza-aprendizaje',       1),
  (1, 'AE2', 'Investigación e Innovación',      'Fomento de la investigación científica y tecnológica',           2),
  (1, 'AE3', 'Extensión Universitaria',         'Proyección social e impacto en la comunidad',                    3),
  (1, 'AE4', 'Gestión y Gobierno Universitario','Modernización y fortalecimiento institucional',                  4),
  (1, 'AE5', 'Bienestar Universitario',         'Permanencia y bienestar de la comunidad universitaria',          5);

INSERT INTO objetivos_generales (area_id, codigo, nombre, orden) VALUES
  (1, 'AE1-OG1', 'Formación integral y de calidad académica',        1),
  (1, 'AE1-OG2', 'Internacionalización académica',                   2),
  (2, 'AE2-OG1', 'Producción y difusión científica',                 1),
  (3, 'AE3-OG1', 'Proyección social e impacto comunitario',          1),
  (4, 'AE4-OG1', 'Fortalecimiento y modernización institucional',    1),
  (5, 'AE5-OG1', 'Permanencia y bienestar estudiantil',              1);

INSERT INTO objetivos_especificos (objetivo_general_id, codigo, nombre, orden) VALUES
  (1, 'AE1-OG1-OE1', 'Actualización y flexibilización curricular',    1),
  (1, 'AE1-OG1-OE2', 'Cualificación del cuerpo docente',              2),
  (2, 'AE1-OG2-OE1', 'Movilidad académica internacional',             1),
  (3, 'AE2-OG1-OE1', 'Investigación formativa y científica',          1),
  (4, 'AE3-OG1-OE1', 'Proyectos de impacto comunitario',              1),
  (5, 'AE4-OG1-OE1', 'Acreditación de programas académicos',          1),
  (6, 'AE5-OG1-OE1', 'Reducción de deserción estudiantil',            1),
  (6, 'AE5-OG1-OE2', 'Programas de apoyo socioeconómico',             2);

INSERT INTO metas (objetivo_especifico_id, codigo, nombre, linea_base, valor_meta, unidad_medida, anio_meta, orden) VALUES
  (1, 'M1.1', 'Renovar mallas en el 100% de programas',           40,   100,  '%',            2026, 1),
  (2, 'M2.1', 'Incrementar docentes PhD al 50%',                  30,    50,  '%',            2026, 1),
  (2, 'M2.2', 'Tasa de graduación oportuna ≥ 85%',               58,    85,  '%',            2026, 2),
  (3, 'M3.1', 'Movilidad estudiantil saliente ≥ 12%',             4,    12,  '%',            2026, 1),
  (4, 'M4.1', 'Publicaciones indexadas ≥ 50 anuales',            20,    50,  'Publicaciones', 2026, 1),
  (5, 'M5.1', '20 proyectos de extensión activos',                8,    20,  'Proyectos',     2026, 1),
  (6, 'M6.1', '80% de programas con acreditación vigente',       45,    80,  '%',            2026, 1),
  (7, 'M7.1', 'Reducir deserción académica a < 10%',             22,    10,  '%',            2026, 1),
  (8, 'M8.1', '300 estudiantes con apoyo activo',               120,   300,  'Estudiantes',   2026, 1);

INSERT INTO indicadores (meta_id, nombre, formula, unidad_medida, linea_base, valor_meta, valor_actual, porcentaje_cumplimiento, periodo_calculo) VALUES
  (1, 'Porcentaje de programas con malla renovada',       '(Prog_Renovados / Total_Programas) * 100',          '%',             40,  100,  80,   80.00,  'anual'),
  (2, 'Porcentaje de docentes con título doctoral',       '(Docentes_PhD / Total_Docentes) * 100',             '%',             30,   50,  40,   50.00,  'anual'),
  (3, 'Tasa de graduación oportuna',                      '(Graduados_Oportunos / Total_Matriculados) * 100',  '%',             58,   85,  65.8, 46.15,  'anual'),
  (4, 'Movilidad estudiantil saliente (%)',               '(Est_Movilidad / Total_Matriculados) * 100',        '%',              4,   12,  8.1,  51.25,  'anual'),
  (5, 'Publicaciones en revistas indexadas',              'Pub_Scopus + Pub_WoS',                              'Publicaciones',  20,   50,  39,   63.33,  'anual'),
  (6, 'Proyectos de extensión activos',                   'Proyectos_Activos',                                 'Proyectos',       8,   20,  15,   58.33,  'semestral'),
  (7, 'Porcentaje de programas acreditados',              '(Prog_Acreditados / Total_Programas_2) * 100',      '%',             45,   80,  70,   71.43,  'anual'),
  (8, 'Tasa de deserción académica',                      '(Desertores / Total_Matriculados_2) * 100',         '%',             22,   10,  18.8, 26.67,  'semestral'),
  (9, 'Estudiantes con apoyo socioeconómico',             'Est_Con_Apoyo',                                     'Estudiantes',   120,  300, 240,   66.67,  'semestral');

-- Variables de ámbito de plan (plan_id = 1)
-- Una misma variable puede ser usada en múltiples fórmulas de indicadores
INSERT INTO variables (plan_id, nombre, descripcion, valor_actual, unidad) VALUES
  (1, 'Prog_Renovados',        'Programas con malla curricular renovada',   16,  'programas'),
  (1, 'Total_Programas',       'Total de programas académicos activos',     20,  'programas'),
  (1, 'Total_Programas_2',     'Total de programas académicos (acred.)',    20,  'programas'),
  (1, 'Docentes_PhD',          'Docentes con título de doctorado',          48,  'docentes'),
  (1, 'Total_Docentes',        'Total de docentes activos',                120,  'docentes'),
  (1, 'Graduados_Oportunos',   'Graduados en tiempo reglamentario',        342,  'estudiantes'),
  (1, 'Total_Matriculados',    'Total de matriculados en el período',      520,  'estudiantes'),
  (1, 'Total_Matriculados_2',  'Total de matriculados (deserción)',        520,  'estudiantes'),
  (1, 'Est_Movilidad',         'Estudiantes en movilidad saliente',         42,  'estudiantes'),
  (1, 'Pub_Scopus',            'Publicaciones en Scopus',                   28,  'artículos'),
  (1, 'Pub_WoS',               'Publicaciones en Web of Science',           11,  'artículos'),
  (1, 'Proyectos_Activos',     'Proyectos de extensión en ejecución',       15,  'proyectos'),
  (1, 'Prog_Acreditados',      'Programas con acreditación vigente',        14,  'programas'),
  (1, 'Desertores',            'Estudiantes que abandonaron el semestre',   98,  'estudiantes'),
  (1, 'Est_Con_Apoyo',         'Estudiantes activos con apoyo asignado',   240,  'estudiantes');

-- Historial de algunas variables para demostración
INSERT INTO variable_historico (variable_id, valor, periodo, usuario_id, observacion) VALUES
  (1, 10, '2022',     1, 'Línea base inicial'),
  (1, 12, '2023',     1, 'Avance primer año'),
  (1, 14, '2024',     1, 'Avance segundo año'),
  (1, 16, '2025-I',   1, 'Semestre actual'),
  (3, 35, '2022',     1, 'Línea base'),
  (3, 40, '2023',     1, 'Incorporación nuevos doctores'),
  (3, 44, '2024',     1, 'Becas de doctorado activas'),
  (3, 48, '2025-I',   1, 'Período actual');

-- ============================================================
-- NOTAS DE CONFIGURACIÓN
-- ============================================================
-- 1. Contraseña de todos los usuarios seed: Admin123!
-- 2. El campo "nombre" en variables debe coincidir
--    exactamente con los identificadores en la fórmula del indicador.
-- 3. Para ejecutar:  mysql -u root -p < database.sql
-- ============================================================
