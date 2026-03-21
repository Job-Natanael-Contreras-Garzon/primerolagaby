-- =============================================
-- PASO 3: ROW LEVEL SECURITY (RLS)
-- Ejecutar DESPUÉS de 02_triggers.sql
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmisiones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_transmision ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_especiales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE veedor_recintos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_requests      ENABLE ROW LEVEL SECURITY;

-- ─── FUNCIONES HELPER ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS VARCHAR AS $$
  SELECT rol FROM usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_usuario_id()
RETURNS INT AS $$
  SELECT id FROM usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_distrito_id()
RETURNS INT AS $$
  SELECT distrito_id FROM usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── POLÍTICAS: usuarios ────────────────────────────────────────────────────

-- Admin tiene control total
CREATE POLICY "admin_all_usuarios" ON usuarios
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

-- supervisor2 lee usuarios de su distrito
CREATE POLICY "sup2_read_usuarios" ON usuarios
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'supervisor2'
    AND distrito_id = get_my_distrito_id()
  );

-- supervisor2 puede editar/desactivar usuario de su jerarquía
CREATE POLICY "sup2_update_usuarios" ON usuarios
  FOR UPDATE TO authenticated
  USING (
    get_my_rol() = 'supervisor2'
    AND distrito_id = get_my_distrito_id()
    AND rol IN ('supervisor1', 'veedor')
  );

-- supervisor1 lee usuarios de su recinto
CREATE POLICY "sup1_read_usuarios" ON usuarios
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'supervisor1'
    AND recinto_id = (SELECT recinto_id FROM usuarios WHERE auth_id = auth.uid())
  );

-- Cada usuario puede ver su propio perfil
CREATE POLICY "self_read_usuario" ON usuarios
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- ─── POLÍTICAS: mesas ───────────────────────────────────────────────────────

CREATE POLICY "admin_all_mesas" ON mesas
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

-- Veedor ve solo mesas de sus recintos asignados
CREATE POLICY "veedor_read_mesas" ON mesas
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'veedor'
    AND recinto_id IN (
      SELECT recinto_id FROM veedor_recintos
      WHERE usuario_id = get_my_usuario_id() AND activo = true
    )
  );

-- Supervisores ven mesas de su distrito
CREATE POLICY "sup_read_mesas" ON mesas
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('supervisor1', 'supervisor2')
    AND recinto_id IN (
      SELECT id FROM recintos WHERE distrito_id = get_my_distrito_id()
    )
  );

-- ─── POLÍTICAS: transmisiones ───────────────────────────────────────────────

CREATE POLICY "admin_all_transmisiones" ON transmisiones
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

-- Veedor gestiona solo sus propias transmisiones
CREATE POLICY "veedor_own_transmisiones" ON transmisiones
  FOR ALL TO authenticated
  USING (
    get_my_rol() = 'veedor'
    AND usuario_id = get_my_usuario_id()
  );

-- Supervisores leen transmisiones de su ámbito
CREATE POLICY "sup_read_transmisiones" ON transmisiones
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('supervisor1', 'supervisor2'));

-- ─── POLÍTICAS: resultados_transmision ─────────────────────────────────────

CREATE POLICY "admin_all_resultados" ON resultados_transmision
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

CREATE POLICY "authenticated_read_resultados" ON resultados_transmision
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "veedor_insert_resultados" ON resultados_transmision
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'veedor'
    AND transmision_id IN (
      SELECT id FROM transmisiones WHERE usuario_id = get_my_usuario_id()
    )
  );

-- ─── POLÍTICAS: votos_especiales ────────────────────────────────────────────

CREATE POLICY "admin_all_votos_especiales" ON votos_especiales
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

CREATE POLICY "authenticated_read_votos_especiales" ON votos_especiales
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "veedor_insert_votos_especiales" ON votos_especiales
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'veedor'
    AND transmision_id IN (
      SELECT id FROM transmisiones WHERE usuario_id = get_my_usuario_id()
    )
  );

-- ─── POLÍTICAS: incidencias ────────────────────────────────────────────────

CREATE POLICY "admin_all_incidencias" ON incidencias
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

CREATE POLICY "sup_manage_incidencias" ON incidencias
  FOR ALL TO authenticated
  USING (get_my_rol() IN ('supervisor1', 'supervisor2'));

CREATE POLICY "veedor_create_incidencia" ON incidencias
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'veedor'
    AND solicitado_por = get_my_usuario_id()
  );

-- ─── POLÍTICAS: monitoreo_config ────────────────────────────────────────────

-- Solo admin puede modificar
CREATE POLICY "admin_write_monitoreo_config" ON monitoreo_config
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

-- Todos pueden leer la configuración
CREATE POLICY "all_read_monitoreo_config" ON monitoreo_config
  FOR SELECT TO authenticated
  USING (true);

-- ─── POLÍTICAS: veedor_recintos ─────────────────────────────────────────────

CREATE POLICY "admin_all_veedor_recintos" ON veedor_recintos
  FOR ALL TO authenticated
  USING (get_my_rol() = 'admin');

CREATE POLICY "sup_manage_veedor_recintos" ON veedor_recintos
  FOR ALL TO authenticated
  USING (get_my_rol() IN ('supervisor1', 'supervisor2'));

CREATE POLICY "veedor_read_own_recintos" ON veedor_recintos
  FOR SELECT TO authenticated
  USING (usuario_id = get_my_usuario_id());

-- ─── POLÍTICAS: bitacora_requests ───────────────────────────────────────────

-- Solo admin puede leer la bitácora
CREATE POLICY "admin_read_bitacora" ON bitacora_requests
  FOR SELECT TO authenticated
  USING (get_my_rol() = 'admin');

-- El service_role inserta en la bitácora (desde backend)
CREATE POLICY "service_insert_bitacora" ON bitacora_requests
  FOR INSERT TO service_role
  WITH CHECK (true);
