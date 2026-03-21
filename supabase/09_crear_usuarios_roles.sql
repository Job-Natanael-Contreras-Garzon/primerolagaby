-- =============================================
-- PASO 9: CREAR USUARIOS POR ROLES
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- ⚠️ NOTA: Es mejor usar Supabase Auth UI o Edge Function para crear usuarios en producción
-- Este script es SOLO para DESARROLLO y DEMO

-- ────────────────────────────────────────────────────────────────
-- 1. ADMIN
-- ────────────────────────────────────────────────────────────────
-- Email: admin@electoral.test | Password: Admin123456!

INSERT INTO usuarios (auth_id, nombre, apellido, email, rol, activo, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Admin',
  'Sistema',
  'admin@electoral.test',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 2. SUPERVISOR DE DISTRITO (Distrito 01)
-- ────────────────────────────────────────────────────────────────
-- Email: supervisor.distrito@electoral.test | Password: Supervisor123!

INSERT INTO usuarios (auth_id, nombre, apellido, email, rol, distrito_id, activo, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Carlos',
  'Sánchez',
  'supervisor.distrito@electoral.test',
  'supervisor2',
  (SELECT id FROM distritos WHERE numero_distrito = 1 LIMIT 1),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 3. SUPERVISOR DE RECINTO (Colegio Central, Distrito 01)
-- ────────────────────────────────────────────────────────────────
-- Email: supervisor.recinto@electoral.test | Password: Supervisor123!

INSERT INTO usuarios (auth_id, nombre, apellido, email, rol, distrito_id, recinto_id, activo, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'María',
  'González',
  'supervisor.recinto@electoral.test',
  'supervisor1',
  (SELECT id FROM distritos WHERE numero_distrito = 1 LIMIT 1),
  (SELECT id FROM recintos WHERE nombre = 'Colegio Central' LIMIT 1),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 4. VEEDOR / DELEGADO (Sin recinto asignado aún - será asignado por supervisor)
-- ────────────────────────────────────────────────────────────────
-- Email: veedor@electoral.test | Password: Veedor123!

INSERT INTO usuarios (auth_id, nombre, apellido, email, rol, activo, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000004'::uuid,
  'Juan',
  'Pérez',
  'veedor@electoral.test',
  'veedor',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- RESUMEN DE CREDENCIALES DE PRUEBA
-- ────────────────────────────────────────────────────────────────

/*
ADMIN:
  - Email: admin@electoral.test
  - Rol: admin
  - Acceso: Todo el sistema

SUPERVISOR DE DISTRITO:
  - Email: supervisor.distrito@electoral.test
  - Rol: supervisor2
  - Distrito: 01
  - Acceso: Ve todos los colegios y mesas del distrito 01

SUPERVISOR DE RECINTO (COLEGIO):
  - Email: supervisor.recinto@electoral.test
  - Rol: supervisor1
  - Recinto: Colegio Central
  - Acceso: Solo mesas de Colegio Central

VEEDOR (DELEGADO):
  - Email: veedor@electoral.test
  - Rol: veedor
  - Acceso: Portal público para reportar resultados

⚠️ IMPORTANTE:
  - Las contraseñas NO se almacenan en la tabla usuarios
  - Se manejan a través de Supabase Auth
  - Para login de desarrollo, usa la Edge Function create-user o el UI de Supabase
*/
