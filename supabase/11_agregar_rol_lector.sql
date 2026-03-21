-- ════════════════════════════════════════════════════════════════
-- AGREGAR ROL "LECTOR" A LA BASE DE DATOS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR CONSTRAINT DE ROLES EN TABLA USUARIOS
-- ────────────────────────────────────────────────────────────────

-- Primero, eliminar la constraint vieja
ALTER TABLE usuarios
DROP CONSTRAINT usuarios_rol_check;

-- Agregar la nueva constraint con "lector" incluido
ALTER TABLE usuarios
ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN ('admin','supervisor2','supervisor1','veedor','lector'));

-- ════════════════════════════════════════════════════════════════
-- ✅ LISTO - El usuario "lector" se creará automáticamente cuando
-- ejecutes: node scripts/create-test-users.mjs
-- ════════════════════════════════════════════════════════════════

