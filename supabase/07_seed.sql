-- =============================================
-- PASO 7: DATOS INICIALES (SEED)
-- Ejecutar DESPUÉS de 01_tablas.sql
-- =============================================

-- Municipio base
INSERT INTO municipios (nombre, departamento) VALUES
  ('Santa Cruz de la Sierra', 'Santa Cruz');

-- 14 Distritos de Santa Cruz de la Sierra
INSERT INTO distritos (nombre, numero_distrito, municipio_id) VALUES
  ('Distrito 1',  1,  1),
  ('Distrito 2',  2,  1),
  ('Distrito 3',  3,  1),
  ('Distrito 4',  4,  1),
  ('Distrito 5',  5,  1),
  ('Distrito 6',  6,  1),
  ('Distrito 7',  7,  1),
  ('Distrito 8',  8,  1),
  ('Distrito 9',  9,  1),
  ('Distrito 10', 10, 1),
  ('Distrito 11', 11, 1),
  ('Distrito 12', 12, 1),
  ('Distrito 13', 13, 1),
  ('Distrito 14', 14, 1);

-- Partidos de ejemplo
INSERT INTO partidos (nombre, sigla, color_hex) VALUES
  ('Demócrata Cristiano', 'PDC', '#1E40AF'),
  ('Movimiento Autonomista', 'MA',  '#15803D'),
  ('Alianza Cruceña',      'AC',  '#B91C1C'),
  ('Frente Amplio',        'FA',  '#7C3AED');

-- Configuración inicial de monitoreo (ya insertada en 01_tablas.sql, esta es de reemplazo seguro)
INSERT INTO monitoreo_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Hacer visibles todos los partidos por defecto en el monitoreo
INSERT INTO monitoreo_partidos_visibles (partido_id, visible)
SELECT id, true FROM partidos
ON CONFLICT (partido_id) DO NOTHING;

-- =============================================
-- RECINTOS DE EJEMPLO (opcional, para pruebas)
-- =============================================
INSERT INTO recintos (nombre, direccion, distrito_id) VALUES
  ('Unidad Educativa Franz Tamayo', 'Av. Cristo Redentor km 3', 1),
  ('Colegio San Ignacio de Loyola', 'Calle La Paz 215', 1),
  ('Unidad Educativa Bolivar',      'Av. Roca y Coronado 450', 2),
  ('Centro Educativo Las Palmas',   'Radial 17.5 km 8',        3);

-- Mesas de ejemplo (2 por recinto)
INSERT INTO mesas (numero_mesa, recinto_id, total_habilitados) VALUES
  ('M-001', 1, 350), ('M-002', 1, 312),
  ('M-001', 2, 298), ('M-002', 2, 275),
  ('M-001', 3, 320), ('M-002', 3, 310),
  ('M-001', 4, 285), ('M-002', 4, 290);
