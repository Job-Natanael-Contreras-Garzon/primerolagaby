-- =============================================
-- PASO 0: CARGAR DATOS DE PRUEBA
-- Ejecutar PRIMERO antes que cualquier otro script
-- =============================================

-- 1. Municipio
INSERT INTO municipios (nombre, departamento, activo)
VALUES ('Santa Cruz', 'Santa Cruz', true)
ON CONFLICT DO NOTHING;

-- 2. Distritos
INSERT INTO distritos (nombre, numero_distrito, municipio_id, activo)
VALUES (
  'Distrito 01',
  1,
  (SELECT id FROM municipios WHERE nombre = 'Santa Cruz' LIMIT 1),
  true
),
(
  'Distrito 02',
  2,
  (SELECT id FROM municipios WHERE nombre = 'Santa Cruz' LIMIT 1),
  true
),
(
  'Distrito 03',
  3,
  (SELECT id FROM municipios WHERE nombre = 'Santa Cruz' LIMIT 1),
  true
)
ON CONFLICT DO NOTHING;

-- 3. Recintos (Colegios)
INSERT INTO recintos (nombre, direccion, distrito_id, lat, lng, activo)
VALUES (
  'Colegio Central',
  'Av. Principal 123',
  (SELECT id FROM distritos WHERE numero_distrito = 1 LIMIT 1),
  -17.8252,
  -63.1629,
  true
),
(
  'Colegio Las Palmas',
  'Calle Las Palmas 456',
  (SELECT id FROM distritos WHERE numero_distrito = 1 LIMIT 1),
  -17.8300,
  -63.1700,
  true
),
(
  'Colegio San Martin',
  'Av. San Martin 789',
  (SELECT id FROM distritos WHERE numero_distrito = 2 LIMIT 1),
  -17.8350,
  -63.1750,
  true
),
(
  'Instituto Técnico',
  'Calle Técnica 111',
  (SELECT id FROM distritos WHERE numero_distrito = 3 LIMIT 1),
  -17.8400,
  -63.1800,
  true
)
ON CONFLICT DO NOTHING;

-- 4. Mesas (Mesas de votación)
INSERT INTO mesas (numero_mesa, recinto_id, total_habilitados, estado, activo)
VALUES (
  'M001A',
  (SELECT id FROM recintos WHERE nombre = 'Colegio Central' LIMIT 1),
  120,
  'pendiente',
  true
),
(
  'M001B',
  (SELECT id FROM recintos WHERE nombre = 'Colegio Central' LIMIT 1),
  125,
  'pendiente',
  true
),
(
  'M002A',
  (SELECT id FROM recintos WHERE nombre = 'Colegio Central' LIMIT 1),
  118,
  'pendiente',
  true
),
(
  'M001A',
  (SELECT id FROM recintos WHERE nombre = 'Colegio Las Palmas' LIMIT 1),
  115,
  'pendiente',
  true
),
(
  'M001A',
  (SELECT id FROM recintos WHERE nombre = 'Colegio San Martin' LIMIT 1),
  122,
  'pendiente',
  true
),
(
  'M001A',
  (SELECT id FROM recintos WHERE nombre = 'Instituto Técnico' LIMIT 1),
  130,
  'pendiente',
  true
)
ON CONFLICT DO NOTHING;

-- 5. Partidos
INSERT INTO partidos (nombre, sigla, color_hex, activo)
VALUES (
  'Frente Progresista',
  'FP',
  '#e6008e',
  true
),
(
  'Alianza Democrática',
  'AD',
  '#00b4d8',
  true
),
(
  'Movimiento Ciudadano',
  'MC',
  '#ffc300',
  true
),
(
  'Unidad Popular',
  'UP',
  '#ff6b6b',
  true
),
(
  'Agrupación Independiente',
  'AI',
  '#6f42c1',
  true
)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════
-- RESUMEN DE DATOS CARGADOS
-- ════════════════════════════════════════════
/*
✅ 1 Municipio: Santa Cruz
✅ 3 Distritos: Distrito 01, 02, 03
✅ 4 Recintos (Colegios):
   - Colegio Central (Distrito 01)
   - Colegio Las Palmas (Distrito 01)
   - Colegio San Martin (Distrito 02)
   - Instituto Técnico (Distrito 03)
✅ 6 Mesas de votación
✅ 5 Partidos

Ahora puedes ejecutar:
1. 09_crear_usuarios_roles.sql (o scripts/create-test-users.mjs)
2. El app debería funcionar correctamente
*/
