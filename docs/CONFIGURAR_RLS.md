# 🔐 Configurar RLS (Row-Level Security) - Seguridad en Producción

## ¿Qué es RLS?
**Row-Level Security (RLS)** es un sistema de control de acceso que asegura que:
- **Admin** ve y edita TODO
- **Supervisor de Distrito** solo ve su distrito
- **Supervisor de Recinto** solo ve su recinto
- **Veedor** solo puede reportar

## Instrucciones: Ejecutar RLS Policies Seguras

### OPCIÓN 1: Manual en Supabase Dashboard (RECOMENDADO)

1. **Abre Supabase Dashboard**
   - Ve a: https://app.supabase.com
   - Selecciona tu proyecto

2. **Ve a SQL Editor**
   - Navigation menu → SQL Editor
   - Click "New query"

3. **Copia el código de policies**
   - Abre el archivo: `supabase/03_rls_policies_seguras.sql`
   - Copia TODO su contenido

4. **Pega y ejecuta**
   - Pega en el SQL Editor
   - Click botón "Run" (o Cmd+Enter)
   - Espera a que termine (verás "✓ Success" en el editor)

5. **Verifica que funcionó**
   - Abre el navegador en: http://localhost:5176
   - Intenta login con: `admin@electoral.test` / `Admin123456!`
   - Si funciona → RLS configurado correctamente ✅

---

### OPCIÓN 2: Script automático (requiere SERVICE_ROLE_KEY)

Si tienes `SUPABASE_SERVICE_ROLE_KEY` en tu `.env`:

```bash
node scripts/setup-rls-policies.mjs
```

> **Nota**: Esta opción requiere una función especial en Supabase. Se recomienda OPCIÓN 1.

---

## ✅ Cómo verificar que funciona

1. **Abre en navegador**: http://localhost:5176
2. **Intenta login**:
   - Email: `admin@electoral.test`
   - Password: `Admin123456!`
3. **Resultado esperado**:
   - ✅ Login exitoso
   - ✅ Redirige a `/panel`
   - ✅ Ve el panel de admin

4. **Prueba otro rol**:
   ```
   Email: supervisor.distrito@electoral.test
   Password: Supervisor123!
   → Debe ver solo su distrito
   
   Email: veedor@electoral.test
   Password: Veedor123!
   → Debe ver form de reporte
   ```

---

## 📊 Permisos configurados

| Tabla | Admin | Supervisor Distrito | Supervisor Recinto | Veedor |
|-------|-------|-------------------|------------------|--------|
| municipios | ✅ Ver/Editar | ✅ Ver | ✅ Ver | ✅ Ver |
| distritos | ✅ Ver/Editar | ✅ Su distrito | ✅ Su distrito | ✅ Ver |
| recintos | ✅ Ver/Editar | ✅ Sus recintos | ✅ Su recinto | ✅ Ver |
| mesas | ✅ Ver/Editar | ✅ Sus mesas | ✅ Sus mesas | ✅ Ver |
| partidos | ✅ Ver/Editar | ✅ Ver | ✅ Ver | ✅ Ver |
| usuarios | ✅ Ver/Editar | Solo su usuario | Solo su usuario | Solo su usuario |
| transmisiones | ✅ Ver/Editar | Ej: Solo sus mesas | Solo sus mesas | ⚠️ Insertar solo |
| resultados_transmision | ✅ Ver/Editar | Solo sus resultados | Solo sus resultados | ⚠️ Insertar solo |

---

## 🔑 Usuarios de prueba

```
ADMIN:
  Email: admin@electoral.test
  Password: Admin123456!
  Acceso: TODO

SUPERVISOR DISTRITO:
  Email: supervisor.distrito@electoral.test
  Password: Supervisor123!
  Acceso: Solo "Distrito 01"

SUPERVISOR RECINTO:
  Email: supervisor.recinto@electoral.test
  Password: Supervisor123!
  Acceso: Solo "Colegio Central"

VEEDOR:
  Email: veedor@electoral.test
  Password: Veedor123!
  Acceso: Reportar votos
```

---

## ❌ Solución de problemas

### Error: "Row-Level Security" (403)
- ✅ El RLS está habilitado (correcto)
- ❌ Las policies NO se ejecutaron
- **Solución**: Ejecuta el archivo SQL en Supabase Dashboard

### Error: "Usuario no encontrado"
- Las policies se ejecutaron pero la BD no tiene el usuario
- **Solución**: 
  ```bash
  node scripts/create-test-users.mjs
  ```

### Login funciona pero no ve datos
- Las policies están muy restrictivas
- **Solución**: Revisa el rol del usuario en la BD:
  ```sql
  SELECT * FROM usuarios WHERE email = 'tu@email.com';
  ```

---

## 🚀 Próximos pasos

1. ✅ Ejecuta el archivo SQL en Supabase Dashboard
2. ✅ Prueba login con cada rol
3. ✅ Verifica que cada usuario ve solo lo que debe
4. ✅ Haz push a Git con: `git add . && git commit -m "feat: rls policies seguras" && git push`

---

## 📝 Referencia: Rol vs Persmisos

```sql
-- En la tabla usuarios, cada usuario tiene un rol:
UPDATE usuarios SET rol = 'admin' WHERE email = 'admin@electoral.test';
UPDATE usuarios SET rol = 'supervisor2' WHERE email = 'supervisor.distrito@electoral.test';
UPDATE usuarios SET rol = 'supervisor1' WHERE email = 'supervisor.recinto@electoral.test';
UPDATE usuarios SET rol = 'veedor' WHERE email = 'veedor@electoral.test';
```

Nombres de rol en BD:
- `admin`: Acceso total
- `supervisor2`: Supervisor de DISTRITO
- `supervisor1`: Supervisor de RECINTO/COLEGIO
- `veedor`: Reportero electoral

---

**¿Dudas?** Revisa el archivo `supabase/03_rls_policies_seguras.sql` para ver exactamente qué se ejecuta.
