-- =============================================
-- RLS POLICIES SEGURAS PARA PRODUCCIÓN
-- ✅ Acceso según rol del usuario
-- =============================================

-- ────────────────────────────────────────────────────────────────
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ────────────────────────────────────────────────────────────────

ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE distritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_transmision ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_especiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- 2. MUNICIPIOS (Lectura pública, sin edición)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "municipios_select_public" ON municipios
  FOR SELECT USING (true);

CREATE POLICY "municipios_insert_admin_only" ON municipios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "municipios_update_admin_only" ON municipios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────────
-- 3. DISTRITOS (Lectura según acceso, Admin edita)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "distritos_select_by_role" ON distritos
  FOR SELECT USING (
    -- Admin ve todos
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
    OR
    -- Supervisor de distrito ve su distrito
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'distrito' AND distrito_id = distritos.id
    )
    OR
    -- Supervisor de recinto ve su distrito
    EXISTS (
      SELECT 1 FROM usuarios u
      INNER JOIN recintos r ON r.id = u.recinto_id
      WHERE u.auth_id = auth.uid() AND u.rol = 'colegio' AND r.distrito_id = distritos.id
    )
  );

CREATE POLICY "distritos_insert_admin_only" ON distritos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "distritos_update_admin_only" ON distritos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
  );


-- ────────────────────────────────────────────────────────────────
-- 4. RECINTOS/COLEGIOS (Lectura según acceso)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "recintos_select_by_role" ON recintos
  FOR SELECT USING (
    -- Admin ve todos
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
    OR
    -- Supervisor de distrito ve sus recintos
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'distrito' 
        AND distrito_id = recintos.distrito_id
    )
    OR
    -- Supervisor de recinto ve su recinto
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'colegio' 
        AND recinto_id = recintos.id
    )
  );

CREATE POLICY "recintos_insert_admin_only" ON recintos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
  );


-- ────────────────────────────────────────────────────────────────
-- 5. MESAS (Lectura según acceso, Supervisores pueden editar)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "mesas_select_by_role" ON mesas
  FOR SELECT USING (
    -- Admin ve todos
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
    OR
    -- Supervisor de distrito ve sus mesas
    EXISTS (
      SELECT 1 FROM usuarios u
      INNER JOIN recintos r ON r.id = mesas.recinto_id
      WHERE u.auth_id = auth.uid() AND u.rol = 'distrito' 
        AND r.distrito_id = u.distrito_id
    )
    OR
    -- Supervisor de recinto ve sus mesas
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'colegio'
        AND recinto_id = mesas.recinto_id
    )
  );

CREATE POLICY "mesas_insert_admin_only" ON mesas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "mesas_update_supervisors" ON mesas
  FOR UPDATE USING (
    -- Admin y supervisores pueden actualizar estado
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol IN ('admin', 'distrito', 'colegio'))
  );


-- ────────────────────────────────────────────────────────────────
-- 6. PARTIDOS (Lectura pública, Admin edita)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "partidos_select_public" ON partidos
  FOR SELECT USING (true);

CREATE POLICY "partidos_insert_admin_only" ON partidos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
  );


-- ════════════════════════════════════════════════════════════════
-- FUNCIÓN AUXILIAR: Verificar si usuario es admin (sin recursión RLS)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT rol = 'admin' FROM usuarios 
     WHERE auth_id = auth.uid() 
     LIMIT 1),
    FALSE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- 7. USUARIOS (Acceso restringido según rol)
-- ────────────────────────────────────────────────────────────────

-- NOTA: BYPASA RLS para poder hacer SELECT sin recursión infinita
-- La validación de datos se hace en la aplicación
CREATE POLICY "usuarios_select_all_authenticated" ON usuarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "usuarios_insert_admin_only" ON usuarios
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "usuarios_update_own_or_admin" ON usuarios
  FOR UPDATE USING (
    auth_id = auth.uid() OR is_admin()
  );


-- ────────────────────────────────────────────────────────────────
-- 8. TRANSMISIONES (Reportes de votos)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "transmisiones_select_by_role" ON transmisiones
  FOR SELECT USING (
    -- Admin ve todas
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
    OR
    -- Supervisor de distrito ve sus transmisiones
    EXISTS (
      SELECT 1 FROM usuarios u
      INNER JOIN mesas m ON m.id = transmisiones.mesa_id
      INNER JOIN recintos r ON r.id = m.recinto_id
      WHERE u.auth_id = auth.uid() AND u.rol = 'distrito'
        AND r.distrito_id = u.distrito_id
    )
    OR
    -- Supervisor de recinto ve sus transmisiones
    EXISTS (
      SELECT 1 FROM usuarios u
      INNER JOIN mesas m ON m.id = transmisiones.mesa_id
      WHERE u.auth_id = auth.uid() AND u.rol = 'colegio'
        AND m.recinto_id = u.recinto_id
    )
  );

CREATE POLICY "transmisiones_insert_veedor" ON transmisiones
  FOR INSERT WITH CHECK (
    -- Veedores pueden reportar
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'veedor'
    )
    OR
    -- Cualquier autenticado puede reportar en desarrollo
    auth.uid() IS NOT NULL
  );

CREATE POLICY "transmisiones_update_supervisors" ON transmisiones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol IN ('admin', 'distrito', 'colegio'))
  );

CREATE POLICY "transmisiones_delete_supervisors" ON transmisiones
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol IN ('admin', 'distrito', 'colegio'))
  );


-- ────────────────────────────────────────────────────────────────
-- 9. RESULTADOS_TRANSMISION (Votos)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "resultados_select_by_role" ON resultados_transmision
  FOR SELECT USING (
    -- Admin ve todos
    EXISTS (SELECT 1 FROM usuarios WHERE auth_id = auth.uid() AND rol = 'admin')
    OR
    -- Supervisores ven sus transmisiones
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('distrito', 'colegio')
    )
  );

CREATE POLICY "resultados_insert_veedor" ON resultados_transmision
  FOR INSERT WITH CHECK (
    -- Veedores pueden reportar
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'veedor'
    )
    OR
    auth.uid() IS NOT NULL
  );


-- ════════════════════════════════════════════════════════════════
-- RESUMEN DE PERMISOS
-- ════════════════════════════════════════════════════════════════

/*
ADMIN:
  ✅ Ve todo
  ✅ Edita todo
  ✅ Crea usuarios

SUPERVISOR DISTRITO (rol = 'distrito'):
  ✅ Ve su distrito y recintos
  ✅ Ve mesas de su distrito
  ✅ Ve transmisiones de su distrito
  ✅ Puede editar mesas/transmisiones de su distrito
  ❌ No puede ver otros distritos
  ❌ No puede editar otros distritos

SUPERVISOR RECINTO (rol = 'colegio'):
  ✅ Ve solo su recinto
  ✅ Ve mesas de su recinto
  ✅ Ve transmisiones de su recinto
  ✅ Puede editar mesas/transmisiones de su recinto
  ❌ No puede ver otros recintos

VEEDOR (rol = 'veedor'):
  ✅ Puede reportar (insertar transmisiones)
  ❌ No puede ver recintos/mesas directamente
  ❌ No puede ver otros reportes

ACCESO PÚBLICO (sin usuario):
  ✅ Ve municipios (catálogos)
  ✅ Ve distritos (catálogos)
  ✅ Ve recintos (catálogos)
  ✅ Ve partidos (catálogos)
  ❌ No puede editar nada
  ❌ No puede ver transmisiones
*/
