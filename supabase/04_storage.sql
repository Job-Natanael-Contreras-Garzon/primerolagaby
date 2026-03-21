-- =============================================
-- PASO 4: STORAGE - Políticas del bucket
-- IMPORTANTE: Primero crear el bucket manualmente en:
--   Supabase Dashboard → Storage → New Bucket
--   Nombre: actas-electorales
--   Public: false (privado)
--
-- Luego ejecutar este SQL en SQL Editor
-- =============================================

-- Solo usuarios autenticados pueden subir imágenes
CREATE POLICY "authenticated_upload_actas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'actas-electorales');

-- Admin y supervisores pueden ver todas las actas
CREATE POLICY "supervisores_read_actas"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'actas-electorales'
    AND get_my_rol() IN ('admin', 'supervisor1', 'supervisor2')
  );

-- Veedores solo leen sus propias actas (path: {usuario_id}/{mesa_id}/...)
CREATE POLICY "veedor_read_own_actas"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'actas-electorales'
    AND (storage.foldername(name))[1] = get_my_usuario_id()::text
  );

-- Admin puede eliminar actas (ej: para reseteos)
CREATE POLICY "admin_delete_actas"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'actas-electorales'
    AND get_my_rol() = 'admin'
  );

-- =============================================
-- CONVENCIÓN DE NOMBRE DE ARCHIVO AL SUBIR:
-- actas-electorales/{usuario_id}/{mesa_id}/{timestamp}.jpg
-- Ejemplo: actas-electorales/42/187/1742000000000.jpg
-- =============================================
