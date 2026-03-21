-- =============================================
-- DESACTIVAR RLS PARA DESARROLLO
-- ⚠️ NUNCA hagas esto en PRODUCCIÓN
-- =============================================

-- Desactivar RLS temporalmente en desarrollo
-- Esto permite que el código acceda a las tablas sin restricciones

ALTER TABLE municipios DISABLE ROW LEVEL SECURITY;
ALTER TABLE distritos DISABLE ROW LEVEL SECURITY;
ALTER TABLE recintos DISABLE ROW LEVEL SECURITY;
ALTER TABLE mesas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE veedor_recintos DISABLE ROW LEVEL SECURITY;
ALTER TABLE partidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE transmisiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_transmision DISABLE ROW LEVEL SECURITY;
ALTER TABLE votos_especiales DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo_partidos_visibles DISABLE ROW LEVEL SECURITY;

-- ✅ RLS desactivado en todas las tablas
-- Ahora puedes hacer login y acceder a datos sin errores 403
