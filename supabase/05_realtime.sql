-- =============================================
-- PASO 5: HABILITAR REALTIME
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- O activar manualmente en: Database → Replication → Tables
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE transmisiones;
ALTER PUBLICATION supabase_realtime ADD TABLE resultados_transmision;
ALTER PUBLICATION supabase_realtime ADD TABLE votos_especiales;
ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
ALTER PUBLICATION supabase_realtime ADD TABLE incidencias;

-- =============================================
-- NOTA: Si el comando ALTER PUBLICATION falla porque
-- Realtime no está habilitado aún en tu plan, también puedes
-- activarlo desde el Dashboard:
--   Database → Replication → Toggle "realtime" en cada tabla listada arriba
-- =============================================
