-- =============================================
-- MIGRATION: Actualizar roles de usuarios
-- Cambiar supervisor2 → distrito, supervisor1 → colegio
-- =============================================

-- 1. Actualizar registros existentes
UPDATE usuarios SET rol = 'distrito' WHERE rol = 'supervisor2';
UPDATE usuarios SET rol = 'colegio' WHERE rol = 'supervisor1';

-- 2. Actualizar el constraint de la tabla usuarios
ALTER TABLE usuarios 
DROP CONSTRAINT "usuarios_rol_check";

ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin','distrito','colegio','veedor'));

-- ✅ Migración completada
-- Los roles ahora son: admin, distrito, colegio, veedor
