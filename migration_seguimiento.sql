-- ============================================================
-- SIGEPU – Migración: Módulo de Seguimiento Semestral
-- Versión 2.0  |  Ejecutar sobre la BD existente (sigepu)
-- ============================================================

USE sigepu;

-- ── 1. Nuevo rol en usuarios ─────────────────────────────────
-- Agrega 'area_estrategica' al ENUM existente
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin','consultor','area_estrategica')
    NOT NULL DEFAULT 'consultor';

-- ── 2. Enlace variable → área (propietaria) ──────────────────
-- Permite indicar qué área estratégica "posee" cada variable.
-- NULL = variable de ámbito de plan (solo admin la modifica directamente).
ALTER TABLE variables
  ADD COLUMN area_id INT NULL AFTER plan_id,
  ADD CONSTRAINT fk_var_area
    FOREIGN KEY (area_id) REFERENCES areas_estrategicas(id) ON DELETE SET NULL;

-- ── 3. Períodos de seguimiento ───────────────────────────────
CREATE TABLE IF NOT EXISTS periodos_seguimiento (
  id           INT          PRIMARY KEY AUTO_INCREMENT,
  plan_id      INT          NOT NULL,
  nombre       VARCHAR(200) NOT NULL   COMMENT 'Ej: Seguimiento I-2025',
  fecha_inicio DATE         NOT NULL,
  fecha_cierre DATE         NOT NULL,
  estado       ENUM('programado','activo','cerrado')
               NOT NULL DEFAULT 'programado',
  creado_por   INT          NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id)   REFERENCES planes(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_periodo_plan_estado (plan_id, estado)
);

-- ── 4. Asignación usuario ↔ área ────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_area (
  id         INT       PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT       NOT NULL,
  area_id    INT       NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (area_id)    REFERENCES areas_estrategicas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usuario_area (usuario_id, area_id)
);

-- ── 5. Solicitudes de cambio ─────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitudes_cambio (
  id                INT            PRIMARY KEY AUTO_INCREMENT,
  periodo_id        INT            NOT NULL,
  variable_id       INT            NOT NULL,
  usuario_id        INT            NOT NULL   COMMENT 'Quien envía la solicitud',
  valor_anterior    DECIMAL(15,4)  NOT NULL,
  valor_propuesto   DECIMAL(15,4)  NOT NULL,
  justificacion     TEXT           NOT NULL,
  documento_url     VARCHAR(500)   NOT NULL   COMMENT 'Ruta relativa del archivo adjunto',
  documento_nombre  VARCHAR(255)   NOT NULL   COMMENT 'Nombre original del archivo',
  estado            ENUM('pendiente','aprobado','rechazado')
                    NOT NULL DEFAULT 'pendiente',
  aprobado_por      INT            NULL       COMMENT 'Admin que resolvió',
  observacion_admin TEXT           NULL,
  fecha_envio       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion  TIMESTAMP      NULL,
  FOREIGN KEY (periodo_id)   REFERENCES periodos_seguimiento(id) ON DELETE CASCADE,
  FOREIGN KEY (variable_id)  REFERENCES variables(id),
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
  FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_sol_periodo  (periodo_id),
  INDEX idx_sol_variable (variable_id),
  INDEX idx_sol_usuario  (usuario_id),
  INDEX idx_sol_estado   (estado)
);

-- ── 6. Usuario de área de ejemplo (seed) ─────────────────────
-- Contraseña: Admin123!
INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Ana Docencia',    'a.docencia@universidad.edu',
   '$2a$10$dMVKXkZFPDbXjW5RSl7P1OJhwwg7Ohw5GEA9lWpDpQghJK3V4DXp6', 'area_estrategica'),
  ('Luis Investigación','l.investigacion@universidad.edu',
   '$2a$10$dMVKXkZFPDbXjW5RSl7P1OJhwwg7Ohw5GEA9lWpDpQghJK3V4DXp6', 'area_estrategica');

-- Asignar usuarios de área a sus áreas estratégicas
-- Ana → Docencia (AE1, id=1),  Luis → Investigación (AE2, id=2)
INSERT IGNORE INTO usuario_area (usuario_id, area_id)
  SELECT u.id, 1 FROM usuarios u WHERE u.email = 'a.docencia@universidad.edu'
  UNION ALL
  SELECT u.id, 2 FROM usuarios u WHERE u.email = 'l.investigacion@universidad.edu';

-- Asignar variables a sus áreas correspondientes (plan 1)
UPDATE variables SET area_id = 1
  WHERE plan_id = 1
    AND nombre IN ('Prog_Renovados','Total_Programas','Total_Programas_2',
                   'Docentes_PhD','Total_Docentes',
                   'Graduados_Oportunos','Total_Matriculados','Total_Matriculados_2',
                   'Est_Movilidad');

UPDATE variables SET area_id = 2
  WHERE plan_id = 1
    AND nombre IN ('Pub_Scopus','Pub_WoS');

UPDATE variables SET area_id = 3
  WHERE plan_id = 1
    AND nombre IN ('Proyectos_Activos');

UPDATE variables SET area_id = 4
  WHERE plan_id = 1
    AND nombre IN ('Prog_Acreditados');

UPDATE variables SET area_id = 5
  WHERE plan_id = 1
    AND nombre IN ('Desertores','Est_Con_Apoyo');

-- ── 7. Período de ejemplo ────────────────────────────────────
INSERT IGNORE INTO periodos_seguimiento
  (plan_id, nombre, fecha_inicio, fecha_cierre, estado, creado_por)
VALUES
  (1, 'Seguimiento I-2025',
   DATE_FORMAT(CURDATE(), '%Y-01-15'),
   DATE_FORMAT(CURDATE(), '%Y-02-05'),
   'cerrado', 1),
  (1, 'Seguimiento II-2025',
   DATE_FORMAT(CURDATE(), '%Y-07-01'),
   DATE_FORMAT(CURDATE(), '%Y-07-21'),
   'programado', 1);

-- ============================================================
-- FIN DE MIGRACIÓN
-- Para ejecutar: mysql -u root -p sigepu < migration_seguimiento.sql
-- ============================================================
