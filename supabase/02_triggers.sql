-- =============================================
-- PASO 2: TRIGGERS Y FUNCIONES
-- Ejecutar DESPUÉS de 01_tablas.sql
-- =============================================

-- 2.1 Función y trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mesas_updated_at
  BEFORE UPDATE ON mesas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2.2 Función y trigger: al insertar transmisión válida → mesa = 'transmitida'
CREATE OR REPLACE FUNCTION actualizar_estado_mesa_transmitida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.es_valida = true THEN
    UPDATE mesas SET estado = 'transmitida' WHERE id = NEW.mesa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transmision_insert
  AFTER INSERT ON transmisiones
  FOR EACH ROW EXECUTE FUNCTION actualizar_estado_mesa_transmitida();

-- 2.3 Función y trigger: al insertar incidencia → mesa = 'incidencia'
CREATE OR REPLACE FUNCTION actualizar_estado_mesa_incidencia()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mesas SET estado = 'incidencia' WHERE id = NEW.mesa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidencia_insert
  AFTER INSERT ON incidencias
  FOR EACH ROW EXECUTE FUNCTION actualizar_estado_mesa_incidencia();

-- 2.4 Función y trigger: al resolver incidencia → invalidar transmisión + mesa = 'no_validada'
CREATE OR REPLACE FUNCTION resolver_incidencia_reseteo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'resuelto' AND OLD.estado = 'pendiente' THEN
    UPDATE transmisiones SET es_valida = false WHERE id = NEW.transmision_id;
    UPDATE mesas SET estado = 'no_validada' WHERE id = NEW.mesa_id;
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidencia_update
  BEFORE UPDATE ON incidencias
  FOR EACH ROW EXECUTE FUNCTION resolver_incidencia_reseteo();
