-- =============================================
-- PASO 8: IMPORTAR RECINTOS + MESAS DESDE EXCEL
-- Respeta el diseño actual (sin cambiar tablas)
-- =============================================

-- Formato esperado en staging:
-- asiento_electoral, municipio, distrito_numero, zona, circunscripcion, recinto, mesas_habilitadas
-- Nota: si no conoces municipio exacto, usa 'Santa Cruz de la Sierra'.

BEGIN;

CREATE TEMP TABLE stg_recintos_import (
  asiento_electoral TEXT,
  municipio         TEXT NOT NULL DEFAULT 'Santa Cruz de la Sierra',
  distrito_numero   INT  NOT NULL,
  zona              TEXT,
  circunscripcion   TEXT,
  recinto           TEXT NOT NULL,
  mesas_habilitadas INT  NOT NULL CHECK (mesas_habilitadas >= 0)
);

-- Lote de carga (puedes seguir agregando más filas debajo)
INSERT INTO stg_recintos_import (asiento_electoral, municipio, distrito_numero, zona, circunscripcion, recinto, mesas_habilitadas)
VALUES
  ('La Peña', 'Santa Cruz de la Sierra', 15, 'Zona 5288', '49', 'Esc. La Peña', 6),
  ('Paurito', 'Santa Cruz de la Sierra', 15, 'Zona 5288', '49', 'Esc. Gabriel Jose Moreno', 11),
  ('San Miguel de Los Junos', 'Santa Cruz de la Sierra', 15, 'Zona 5288', '49', 'U.E. San Miguel Aponte', 3),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CI', '44', 'Col. Gabriel Rene Moreno', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CI', '44', 'Kinder Luisa Saucedo', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CII', '45', 'Col. Inst. Domingo Savio', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CII', '45', 'Col. Romulo Herrera', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CIII', '45', 'Col. Basilio De Cuellar', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CIII', '45', 'Col. Nacional Florida', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CIII', '45', 'Colegio Marista', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CIV', '51', 'Col. Arz. Daniel Rivero', 1),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'CIV', '51', 'U.E. Rómulo Gomez I', 1),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 1', '45', 'U.E. Latinoamericano', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 10', '51', 'Col. Placido Molina', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 11', '51', 'Col. Fe y Alegria La Merced', 17),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 12', '44', 'U.E. Walter Suarez', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 13', '44', 'Campus Universitario', 12),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 13', '44', 'Colegio Castulo Chavez', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 2', '45', 'Col. Republica del Uruguay', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 3', '45', 'Col. Gaston Guillaix', 16),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 4', '45', 'Col. Dios es Amor', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 5', '45', 'Col. Club De Leones', 8),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 6', '45', 'Col. Josefina Goytia', 6),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 7', '45', 'Colegio Don Bosco', 11),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 8', '51', 'Col. Club De Leones Nro. 6', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 8', '51', 'Col. Julio A. Gutierrez', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 11, 'UV 9', '51', 'Col. Unidad Educativa Lorenzo', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'ET 41', '50', 'Pedro Diez', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 106', '50', 'Colegio Martin Sapp', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 106', '50', 'U.E. Bautista Vida Nueva', 14),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 107', '50', 'U.E. Niño Jesús IV', 20),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 114', '50', 'Colegio Adela Zamudio', 28),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 114', '50', 'U.E. Nestor Paz Zamora', 30),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 115', '50', 'Col. Esc. Naun Fernandez', 14),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 116', '50', 'Col. San Pablo', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 116', '50', 'U.E. Libertador Simón Bolivar', 6),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 122', '50', 'Modulo Educativo Maria D', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 123', '50', 'Universitario Sur', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 129', '50', 'Col. Part. Alfred B. Nobel', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 131', '50', 'Col. Las Americas II', 19),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 131', '50', 'UE. El Paraíso', 21),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 132', '50', 'Sahara Guardia', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 133', '50', 'U.E. Victoria Diez', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 134', '50', 'Modulo Educativo Republica', 12),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 186', '50', 'Colegio San Jorge', 12),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 9, 'UV 188', '50', 'Col. Esc. Honorato Mejia', 16),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'ET 33', '47', 'Col. Nimia Centella', 17),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'ET 34', '47', 'Kinder Nimia Centella', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 100', '48', 'Col. San Silvestre', 26),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 156', '48', 'Col. Primavera', 26),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 156', '48', 'U.E. Florida Barba Chávez', 11),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 156A', '48', 'Col. Cupesi Terrado', 22),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 156A', '48', 'U.E. 25 de Octubre', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 226', '47', 'U.E. 4 de Febrero', 6),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 227', '47', 'Col. Guapijo Junin', 17),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 228', '47', 'U.E. Pedro Rivero Mercado', 23),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 233', '47', 'Col. Alan Farah', 14),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 262', '47', 'U.E. Arboleda De Fatima', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 286', '48', 'Col. El Buen Samaritano', 21),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 292', '48', 'U.E. San Juan Bautista', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 81', '47', 'Col. Madre Clara Ricci', 11),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 82', '47', 'Col. Bertha Cuellar', 23),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 83', '47', 'Módulo Educativo Boris Banzer', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 83', '47', 'U.E. Hacia La Cumbre', 6),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 84', '47', 'Col. 18 de Marzo', 28),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 84', '47', 'Col. Fausto Medrano', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 85B', '47', 'U.E. Maria De Las Candelarias', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 86', '47', '12 de Abril (Modulo 20 de Junio)', 15),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 86', '47', 'Col. Pampa De La Cruz', 12),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 86', '47', 'U.E. 1ro. De Mayo', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 86', '47', 'U.E. San Martin de Porres', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 87', '47', 'Col. Batallon Tren', 8),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 88', '47', 'Col. Humberto Eguez', 19),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 89', '47', 'Col. Gilberto Menacho', 16),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 89', '47', 'Kinder Libertad', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 94', '47', 'U.E. Kinder 27 de Mayo', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 94', '47', 'U.E. 27 de mayo', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 95', '47', 'Col. Angela Pinckert', 29),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 7, 'UV 98', '48', 'Col. Educativo San Isidro', 20),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'ET 17', '45', 'Col. Ramon Dario Gutierrez', 8),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'ET 8', '45', 'Col. Juan Pablo II', 15),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 24', '45', 'Colegio Justo Leigue', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 43B', '45', 'Col. Felix Bascope Sanandita', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 43B', '45', 'Col. San Carlos', 9),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 44', '45', 'Col. Fe y Alegria Aniceto Arze', 23),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 44', '45', 'U.E. Dennys Antelo Jordan', 2),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 46', '45', 'Col. El Pajonal', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 46', '45', 'Colegio Raquel Sossa', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 80', '45', 'Col. Felix Bascope', 18),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 91', '45', 'Col. Heroes Del Chaco', 22),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 91A', '45', 'Col. 30 de Marzo', 17),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 3, 'UV 92', '45', 'U.E. Ramon Dario Gutierrez A', 18),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'ET 21', '44', 'Esc. Normal Enriquet Finot', 24),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'PSU 5', '44', 'Col. Ovidio Santistevan', 20),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'PSU 5', '44', 'Col. Villa Bolivia', 18),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'PSU 5', '44', 'U.E. Isuto', 7),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 112', '51', 'Col. Escuela Sara Porras De Pinto', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 112A', '51', 'Col. Escuela Ambrocio Villarroel', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 30', '51', 'Col. Jhon Kennedy', 25),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 30', '51', 'U.E. John Fitzgerald Kennedy III', 4),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 30', '51', 'U.E. Lucas Casaert', 2),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 31', '44', 'Col. Hnas. Arredondo', 14),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 31', '44', 'U.E. Pastorcito De Fátima', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 32', '44', 'Col. San Martin De Porres', 29),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 33', '44', 'Esc. Rene Barrientos', 16),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 35', '44', 'Col. Mirette Sciaroni', 11),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 36', '44', 'Esc. Aponte Tineo', 10),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 53', '51', 'U.E. El Porvenir', 2),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 54', '51', 'Col. UV. La Madre', 22),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 55', '44', 'Col. La Madre', 21),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 56', '44', 'Gladys Rivero De Jimenez', 16),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 57', '44', 'Kinder Guarderia El Carmen', 5),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 59', '44', 'Esc. Bernardo Cadarío', 11),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 61', '44', 'Modulo Educativo Jose Miguel De Velasco', 18),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 62', '44', 'Escuela San Carlos', 13),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 63', '44', 'Col. Virgen De Cotoca', 6),
  ('Santa Cruz de la Sierra', 'Santa Cruz de la Sierra', 1, 'UV 63', '44', 'U.E. Kinder Virgen de Cotoca II', 11);

-- 1) Municipios
INSERT INTO municipios (nombre, departamento, activo)
SELECT DISTINCT coalesce(nullif(trim(s.municipio), ''), 'Santa Cruz de la Sierra'), 'Santa Cruz', true
FROM stg_recintos_import s
WHERE NOT EXISTS (
  SELECT 1
  FROM municipios m
  WHERE lower(m.nombre) = lower(coalesce(nullif(trim(s.municipio), ''), 'Santa Cruz de la Sierra'))
);

-- 2) Distritos
INSERT INTO distritos (nombre, numero_distrito, municipio_id, activo)
SELECT DISTINCT
  'Distrito ' || s.distrito_numero,
  s.distrito_numero,
  m.id,
  true
FROM stg_recintos_import s
JOIN municipios m ON lower(m.nombre) = lower(coalesce(nullif(trim(s.municipio), ''), 'Santa Cruz de la Sierra'))
WHERE NOT EXISTS (
  SELECT 1
  FROM distritos d
  WHERE d.numero_distrito = s.distrito_numero
    AND d.municipio_id = m.id
);

-- 3) Recintos
-- Como no hay columnas zona/circunscripcion/asiento, se guarda esa metadata en direccion.
INSERT INTO recintos (nombre, direccion, distrito_id, activo)
SELECT
  s.recinto,
  concat_ws(' | ',
    CASE WHEN s.asiento_electoral IS NOT NULL AND s.asiento_electoral <> '' THEN 'Asiento: ' || s.asiento_electoral END,
    CASE WHEN s.zona IS NOT NULL AND s.zona <> '' THEN 'Zona: ' || s.zona END,
    CASE WHEN s.circunscripcion IS NOT NULL AND s.circunscripcion <> '' THEN 'Circun: ' || s.circunscripcion END
  ) AS direccion,
  d.id,
  true
FROM stg_recintos_import s
JOIN municipios m ON lower(m.nombre) = lower(coalesce(nullif(trim(s.municipio), ''), 'Santa Cruz de la Sierra'))
JOIN distritos d
  ON d.municipio_id = m.id
 AND d.numero_distrito = s.distrito_numero
WHERE NOT EXISTS (
  SELECT 1
  FROM recintos r
  WHERE lower(r.nombre) = lower(s.recinto)
    AND r.distrito_id = d.id
);

-- 4) Mesas: crea SOLO las faltantes hasta alcanzar mesas_habilitadas por recinto
DO $$
DECLARE
  fila RECORD;
  v_recinto_id INT;
  v_existentes INT;
  i INT;
BEGIN
  FOR fila IN
    SELECT
      s.*,
      m.id AS municipio_id,
      d.id AS distrito_id
    FROM stg_recintos_import s
    JOIN municipios m ON lower(m.nombre) = lower(coalesce(nullif(trim(s.municipio), ''), 'Santa Cruz de la Sierra'))
    JOIN distritos d
      ON d.municipio_id = m.id
     AND d.numero_distrito = s.distrito_numero
  LOOP
    SELECT r.id INTO v_recinto_id
    FROM recintos r
    WHERE lower(r.nombre) = lower(fila.recinto)
      AND r.distrito_id = fila.distrito_id
    LIMIT 1;

    SELECT count(*) INTO v_existentes
    FROM mesas me
    WHERE me.recinto_id = v_recinto_id;

    IF v_existentes < fila.mesas_habilitadas THEN
      FOR i IN (v_existentes + 1)..fila.mesas_habilitadas LOOP
        INSERT INTO mesas (numero_mesa, recinto_id, total_habilitados, estado, activo)
        VALUES (
          'M-' || lpad(i::text, 3, '0'),
          v_recinto_id,
          0,
          'pendiente',
          true
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =============================================
-- VALIDACIONES RÁPIDAS
-- =============================================

-- Recintos por distrito
-- SELECT d.nombre AS distrito, count(*) AS recintos
-- FROM recintos r
-- JOIN distritos d ON d.id = r.distrito_id
-- GROUP BY d.nombre
-- ORDER BY d.nombre;

-- Mesas por recinto (comparar contra tu Excel)
-- SELECT r.nombre AS recinto, count(m.id) AS mesas_creadas
-- FROM recintos r
-- LEFT JOIN mesas m ON m.recinto_id = r.id
-- WHERE r.distrito_id = (
--   SELECT id FROM distritos
--   WHERE numero_distrito = 12
--   LIMIT 1
-- )
-- GROUP BY r.nombre
-- ORDER BY r.nombre;
