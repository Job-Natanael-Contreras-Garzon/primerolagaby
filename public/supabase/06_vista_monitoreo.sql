-- =============================================
-- PASO 6: VISTA PARA MONITOREO EN TIEMPO REAL
-- Ejecutar DESPUÉS de 01_tablas.sql
-- =============================================

CREATE OR REPLACE VIEW vista_monitoreo AS
SELECT
  p.id              AS partido_id,
  p.nombre          AS partido,
  p.sigla,
  p.color_hex,
  rt.tipo_cargo,
  d.id              AS distrito_id,
  d.nombre          AS distrito,
  r.id              AS recinto_id,
  r.nombre          AS recinto,
  SUM(rt.votos_obtenidos) AS total_votos
FROM resultados_transmision rt
JOIN transmisiones t   ON t.id = rt.transmision_id AND t.es_valida = true
JOIN mesas m           ON m.id = t.mesa_id
JOIN recintos r        ON r.id = m.recinto_id
JOIN distritos d       ON d.id = r.distrito_id
JOIN partidos p        ON p.id = rt.partido_id
GROUP BY
  p.id, p.nombre, p.sigla, p.color_hex,
  rt.tipo_cargo,
  d.id, d.nombre,
  r.id, r.nombre;

-- =============================================
-- USO DESDE EL FRONTEND:
--
-- // Total por partido y cargo (municipio completo)
-- const { data } = await supabase.from('vista_monitoreo').select()
--
-- // Filtrar solo alcaldes en el distrito 3
-- const { data } = await supabase
--   .from('vista_monitoreo')
--   .select()
--   .eq('tipo_cargo', 'alcalde')
--   .eq('distrito_id', 3)
--
-- NOTA: Solo incluye transmisiones donde es_valida = true.
-- Las mesas con incidencia resueltas quedan automáticamente excluidas.
-- =============================================
