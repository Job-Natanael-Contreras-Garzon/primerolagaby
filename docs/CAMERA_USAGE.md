# 📸 Cómo Usar la Cámara en tu Aplicación

## ✅ Se Ha Corregido

Los errores de módulos se han arreglado. Ahora puedes usar la cámara de forma simple y efectiva tanto en:
- ✅ Navegador normal (escritorio/móvil)
- ✅ App PWA instalada
- ✅ Funciona completamente offline

---

## 🚀 Uso Rápido (3 opciones)

### **Opción 1: Agregá una sección de cámara a tu UI** (MÁS FÁCIL)

```typescript
import { createVeeedorCameraSection } from './utils/camera-integration'

// En tu función que crea la UI:
async function mostrarFormularioVeedor() {
  const container = document.querySelector('#form-container')
  
  // Crear sección con cámara
  const cameraSection = await createVeeedorCameraSection()
  container?.appendChild(cameraSection)
}

// Llamar cuando sea necesario
mostrarFormularioVeedor()
```

### **Opción 2: Formulario completo con cámara**

```typescript
import { createSolicitudFormWithCamera } from './utils/camera-integration'

async function crearFormularioSolicitud() {
  const form = await createSolicitudFormWithCamera({
    title: '📝 Nueva Solicitud Electoral',
    submitButtonText: '✅ Enviar para Revisión',
    onSubmit: async (data) => {
      console.log('Datos del formulario:', data)
      // Enviar a tu API o Supabase
      // await enviarASuabase(data)
    }
  })
  
  document.querySelector('#app')?.appendChild(form)
}
```

### **Opción 3: Montar directamente en un elemento**

```typescript
import { mountCameraToElement } from './utils/camera-integration'

// Si ya tienes un div con id="camera-container"
await mountCameraToElement('#camera-container', {
  autoStart: false,
  title: '🎥 Capturar Documentación'
})
```

---

## 💡 Ejemplos Reales

### Para la interfaz del **Veedor**:

```typescript
// En tu archivo de UI del veedor:
import { createSolicitudFormWithCamera } from './src/utils/camera-integration'

export async function renderVeeedorPanel() {
  const app = document.querySelector('#app')
  
  // Crear formulario con cámara
  const form = await createSolicitudFormWithCamera({
    title: '📸 Reportar desde Mesa Electoral',
    submitButtonText: '✅ Enviar Reporte',
    onSubmit: async (data) => {
      // data.description - lo que escribió
      // data.photo_url - URL de la foto subida
      // data.timestamp - cuándo se capturó
      
      console.log('Enviando reporte:', data)
      // Guardar en Supabase
    }
  })
  
  app?.appendChild(form)
}
```

### Para Administrador (gestión de documentos):

```typescript
import { createVeeedorCameraSection } from './src/utils/camera-integration'

export async function renderAdminPhotoUpload() {
  const section = await createVeeedorCameraSection({
    enableAlternateCamera: true
  })
  
  document.querySelector('#upload-area')?.appendChild(section)
}
```

---

## 🔍 Verificar Soporte de Cámara

Antes de mostrar los controles de cámara, puedes verificar compatibilidad:

```typescript
import { checkCameraSupport } from './src/utils/camera-integration'

async function verificarCamara() {
  const { supported, hasMultipleCameras, cameras } = await checkCameraSupport()
  
  console.log('✅ Cámara soportada:', supported)
  console.log('✅ Múltiples cámaras:', hasMultipleCameras)
  console.log('✅ Cámaras disponibles:', cameras)
  
  if (!supported) {
    alert('Este dispositivo no tiene cámara')
    return
  }
  
  // Mostrar UI de cámara
}
```

---

## 📱 En Diferentes Contextos

### En **Navegador de Escritorio** 🖥️
- Abre tu app en Chrome/Firefox
- Click en "Iniciar Cámara"
- Se abrirá la cámara web
- Captura fotos y sube a Supabase

### En **Mobile (Navegador)** 📱
- Abre en Chrome/Safari en tu celular
- Tu navegador solicitará permisos de cámara
- Selecciona la cámara (frontal/trasera)
- Captura y sube

### En **PWA Instalada** 📲
- Instala la app desde el navegador
- Abre la app
- Funcionará igual que en navegador
- **Bonus:** Funciona offline también

---

## ⚙️ Configuración Avanzada

### Personalizar colores y estilos

```typescript
const section = await createVeeedorCameraSection()

// Personalizar contenedor
section.style.background = '#e0f2fe'
section.style.borderColor = '#0284c7'

document.querySelector('#container')?.appendChild(section)
```

### Captura sin UI automática

```typescript
import { initializeCameraModule } from './src/utils/camera-integration'

const { cameraManager } = await initializeCameraModule()

// Acceso a todo lo manual
const hasPermission = await cameraManager.requestCameraPermission()
const cameras = await cameraManager.getAvailableCameras()
const canToggle = await cameraManager.hasMultipleCameras()

// etc...
```

---

## 🐛 Solución de Problemas

### "La cámara no funciona"
1. Verifica permisos: Configuración → Permisos → Cámara
2. Asegúrate de usar HTTPS (Vercel lo proporciona)
3. En desarrollo local: `http://localhost:5173` también funciona

### "No puedo instalar como PWA"
1. Abre en Chrome/Edge
2. Espera a que aparezca el icono "Instalar"
3. En iOS Safari: "Compartir → Añadir a Pantalla de Inicio"

### "Fotos no se suben a Supabase"
1. Verifica que estés autenticado en Supabase
2. Revisa que el bucket `solicitudes-distrito` exista
3. Mira los logs en F12 → Console

---

## 📚 Archivos Relevantes

- **`src/utils/camera.ts`** - Control bajo nivel de cámara
- **`src/utils/camera-upload.ts`** - Upload a Supabase
- **`src/utils/camera-integration.ts`** - ← **USAR ESTE PARA INTEGRAR**
- **`docs/CAMERA_PWA_GUIDE.md`** - Documentación completa

---

## ✨ Características Incluidas

✅ Captura de fotos en alta resolución  
✅ Alternancia frontal/trasera  
✅ Preview en tiempo real  
✅ Upload automático a Supabase Storage  
✅ URLs públicas  
✅ Funciona offline  
✅ Lazy loading (no ralentiza tu app)  
✅ Manejo de errores robusto  
✅ Estilos responsivos  

---

## 🎯 Próximo Paso

1. **Integra en main.ts:**
   ```typescript
   import { createSolicitudFormWithCamera } from './utils/camera-integration'
   
   // En tu función de renderizado
   const form = await createSolicitudFormWithCamera()
   app.appendChild(form)
   ```

2. **Prueba en desarrollo:**
   ```bash
   npm run dev
   # Abre http://localhost:5173
   ```

3. **Verifica que compila:**
   ```bash
   npm run build
   ```

4. **Haz deploy:**
   ```bash
   git add .
   git commit -m "feat: integrar captura de cámara"
   git push origin main
   ```

¡Listo! Ya tienes cámara funcionando tanto en navegador como en PWA. 🎉
