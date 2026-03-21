-- ════════════════════════════════════════════════════════════════
-- LIMPIAR TODAS LAS POLÍTICAS VIEJAS Y RECONFIGUAR SIN RECURSIÓN
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "municipios_select_public" ON municipios;
DROP POLICY IF EXISTS "municipios_insert_admin_only" ON municipios;
DROP POLICY IF EXISTS "municipios_update_admin_only" ON municipios;

DROP POLICY IF EXISTS "distritos_select_by_role" ON distritos;
DROP POLICY IF EXISTS "distritos_insert_admin_only" ON distritos;
DROP POLICY IF EXISTS "distritos_update_admin_only" ON distritos;

DROP POLICY IF EXISTS "recintos_select_by_role" ON recintos;
DROP POLICY IF EXISTS "recintos_insert_admin_only" ON recintos;

DROP POLICY IF EXISTS "mesas_select_by_role" ON mesas;
DROP POLICY IF EXISTS "mesas_insert_admin_only" ON mesas;
DROP POLICY IF EXISTS "mesas_update_supervisors" ON mesas;

DROP POLICY IF EXISTS "partidos_select_public" ON partidos;
DROP POLICY IF EXISTS "partidos_insert_admin_only" ON partidos;

DROP POLICY IF EXISTS "usuarios_select_own_or_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin_only" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_self_or_admin" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_all_authenticated" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own_or_admin" ON usuarios;

DROP POLICY IF EXISTS "transmisiones_select_by_role" ON transmisiones;
DROP POLICY IF EXISTS "transmisiones_insert_veedor" ON transmisiones;
DROP POLICY IF EXISTS "transmisiones_update_supervisors" ON transmisiones;
DROP POLICY IF EXISTS "transmisiones_delete_supervisors" ON transmisiones;

DROP POLICY IF EXISTS "resultados_select_by_role" ON resultados_transmision;
DROP POLICY IF EXISTS "resultados_insert_veedor" ON resultados_transmision;

DROP FUNCTION IF EXISTS is_admin();

-- ────────────────────────────────────────────────────────────────
-- 2. DESHABILITAR RLS TEMPORALMENTE (para desarrollo)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE municipios DISABLE ROW LEVEL SECURITY;
ALTER TABLE distritos DISABLE ROW LEVEL SECURITY;
ALTER TABLE recintos DISABLE ROW LEVEL SECURITY;
ALTER TABLE mesas DISABLE ROW LEVEL SECURITY;
ALTER TABLE partidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE transmisiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_transmision DISABLE ROW LEVEL SECURITY;
ALTER TABLE votos_especiales DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias DISABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- RESUMEN
-- ════════════════════════════════════════════════════════════════

/*
✅ SE HA HECHO:
  1. Eliminadas todas las políticas viejas
  2. RLS DESHABILITADO en todas las tablas (desarrollo)
  
📋 PRÓXIMO PASO:
  Cuando esté funcionando todo, ejecutar:
  supabase/03_rls_policies_seguras.sql
  para habilitar seguridad en producción
*/
