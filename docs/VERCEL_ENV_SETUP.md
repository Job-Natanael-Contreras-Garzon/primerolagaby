# Configuración de Variables de Ambiente en Vercel

Sigue estos pasos para configurar correctamente las variables en Vercel:

## 1. Ve al Dashboard de Vercel
- Accede a https://vercel.com
- Selecciona tu proyecto `primerolagaby`

## 2. Settings → Environment Variables
- Click en **Settings** (engranaje)
- En el menú lateral izquierdo, selecciona **Environment Variables**

## 3. Agrega las variables necesarias

Haz click en "+ Add New" y agrega estas variables:

### Variable 1: VITE_SUPABASE_URL
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://jnqjrsujjhpanglkhacw.supabase.co`
- **Environment:** Production, Preview, Development (marca los 3)
- Click en "Add"

### Variable 2: VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
- **Name:** `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- **Value:** `sb_publishable_l9jejASzyEBZ05DI4l7lFw_f-biRJEO`
- **Environment:** Production, Preview, Development (marca los 3)
- Click en "Add"

## 4. Redeploy
Después de agregar las variables:
- Ve a **Deployments**
- Click en el menú (⋮) del último deployment
- Selecciona **Redeploy**
- Espera a que construya

## ✅ Verificación
Una vez completado, deberías ver:
- ✅ Build exitoso en Vercel
- ✅ Checks pasando en GitHub
- ✅ No más errores de variables de ambiente

## 📝 Nota de Seguridad
Estas son variables públicas (prefijo `VITE_`), por lo que están expuestas en el código compilado. No agregues secretos aquí (como secrect keys o tokens privados).

Para datos sensibles:
1. Usa `SUPABASE_SECRET_KEY` en Edge Functions backend
2. Configura Row Level Security (RLS) en Supabase para proteger datos
3. Valida siempre en el backend antes de operaciones críticas
