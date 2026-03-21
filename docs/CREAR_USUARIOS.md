# 🔐 Creación de Usuarios por Rol

## Opción 1: Script Automático (Recomendado) ⭐

### Paso 1: Obtén tu Service Role Key
1. Ve a **Supabase Dashboard** → **Project Settings** → **API**
2. Copia el **service_role** key (⚠️ Mantén esto secreto)

### Paso 2: Configura las variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# .env.local (NO compartir este archivo)
VITE_SUPABASE_URL=https://jnqjrsujjhpanglkhacw.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_l9jejASzyEBZ05DI4l7lFw_f-biRJEO
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Ejecuta el script
```bash
node scripts/create-test-users.mjs
```

Esto te creará 4 usuarios automáticamente:

---

## 📊 Usuarios Creados

### 1️⃣ ADMIN
```
Email:      admin@electoral.test
Contraseña: Admin123456!
Rol:        admin
Acceso:     ✅ Todo el sistema
```

### 2️⃣ SUPERVISOR DE DISTRITO
```
Email:      supervisor.distrito@electoral.test
Contraseña: Supervisor123!
Rol:        supervisor2
Acceso:     ✅ Todos colegios/mesas del Distrito 01
```

### 3️⃣ SUPERVISOR DE RECINTO
```
Email:      supervisor.recinto@electoral.test
Contraseña: Supervisor123!
Rol:        supervisor1
Acceso:     ✅ Solo Colegio Central (Distrito 01)
```

### 4️⃣ VEEDOR (Delegado)
```
Email:      veedor@electoral.test
Contraseña: Veedor123!
Rol:        veedor
Acceso:     ✅ Portal público para reportar
```

---

## Opción 2: SQL Manual

Ejecuta `supabase/09_crear_usuarios_roles.sql` en **SQL Editor** de Supabase:

```sql
-- Esto solo crea los registros en la tabla usuarios
-- Para Supabase Auth, debes usar el script automático o el UI de Supabase
```

---

## 🧪 Pruebas de Desarrollo

### Probar sin autenticación (Fallback localStorage)
1. Abre http://localhost:5174
2. Haz clic en "Login de Acceso"
3. Selecciona el rol en el dropdown
4. Ingresa cualquier usuario/contraseña
5. ✅ Hace login con el rol seleccionado (sin validar Supabase Auth)

### Probar con autenticación real
1. Crea los usuarios con el script automático
2. Abre http://localhost:5174
3. Haz clic en "Login de Acceso"
4. Usa las credenciales reales del script:
   - Email: `admin@electoral.test`
   - Contraseña: `Admin123456!`

---

## Desactivar RLS durante desarrollo

Si ves errores **403** (prohibido), necesitas desactivar Row-Level Security:

```sql
-- En SQL Editor de Supabase:
ALTER TABLE recintos DISABLE ROW LEVEL SECURITY;
ALTER TABLE partidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE mesas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE transmisiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_transmision DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias DISABLE ROW LEVEL SECURITY;
```

---

## 📋 Estructura de Roles

```
USUARIO FINAL (Veedor)
├── Sin autenticación requerida
├── Puede reportar resultados
└── Los datos se guardan en localStorage + opcionalmente Supabase

        ↓ Validación por Supervisor

SUPERVISOR DE RECINTO (supervisor1)
├── Autenticado
├── Asignado a 1 recinto (colegio)
├── Ve solo mesas de su recinto
├── Puede auditar y editar actas
└── Crear delegados (veedores)

        ↓ Escalada regional

SUPERVISOR DE DISTRITO (supervisor2)
├── Autenticado
├── Asignado a 1 distrito
├── Ve múltiples recintos/colegios
├── Monitoreo consolidado
└── Gestionar supervisores de recinto

        ↓ Control total

ADMINISTRADOR (admin)
├── Autenticado
├── Ve todos los distritos
├── Gestión completa de usuarios
├── Gestión de catálogos
└── Reportes globales
```

---

## 🚨 Troubleshooting

### Error: "Service Role Key no configurada"
→ Agrega `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`

### Error: "User already exists"
→ El usuario ya fue creado. Salta al siguiente.

### Error 403 en Supabase
→ Desactiva RLS (ver sección arriba)

### No puedo hacer login
→ Intenta con el fallback localStorage (cualquier usuario/contraseña)

---

## 🔒 Seguridad en Producción

⚠️ **NUNCA hagas esto en producción:**
- ❌ Compartir el Service Role Key
- ❌ Desactivar RLS sin policies
- ❌ Hardcodear contraseñas
- ❌ Guardar tokens en localStorage

Usa Supabase Auth UI oficial y configura RLS policies correctamente.
