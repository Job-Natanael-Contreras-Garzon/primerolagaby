# 📷 Guía de Integración PWA y Captura de Cámara

Este documento explica cómo usar el PWA y los módulos de cámara que hemos configurado.

## 🎯 ¿Qué hemos configurado?

### 1. **Manifest PWA** (`public/manifest.json`)
- Hace que tu aplicación sea instalable en dispositivos
- Define permisos de cámara y compartición
- Permite acceso sin conexión

### 2. **Service Worker** (`public/service-worker.js`)
- Cachea recursos para funcionar offline
- Sincroniza datos en background
- Permite actualizar sin recargar

### 3. **Módulos de Cámara**
- `src/utils/camera.ts` - Control de cámara de bajo nivel
- `src/utils/camera-upload.ts` - Interfaz con UI integrada

## 🚀 Cómo Usar en tu Aplicación

### Opción 1: UI Completa (Recomendado)

Si quieres una interfaz lista para usar con botones y preview:

```typescript
import { cameraUploadManager } from './utils/camera-upload'

// En tu función de renderizado (donde creas la UI)
function renderUploadSection(container: HTMLElement) {
  const ui = cameraUploadManager.createCameraUI()
  container.appendChild(ui.container)
  
  // Limpiar cuando se desmonte
  return () => cameraUploadManager.cleanup()
}
```

### Opción 2: Control Manual

Si necesitas más control:

```typescript
import { cameraManager } from './utils/camera'

async function initCamera(videoElement: HTMLVideoElement) {
  try {
    // Iniciar cámara trasera (environment)
    const cameraStream = await cameraManager.startCamera(videoElement, {
      facingMode: 'environment',
      width: 1280,
      height: 720
    })
    
    // Capturar foto
    const photoBlob = await cameraManager.capturePhotoAsync(videoElement, {
      quality: 0.9,
      format: 'image/jpeg'
    })
    
    // Convertir a File
    const photoFile = cameraManager.blobToFile(photoBlob, 'foto.jpg')
    
    // Usar el archivo...
    console.log('Foto capturada:', photoFile)
    
    // Limpiar
    cameraStream.stop()
  } catch (error) {
    console.error('Error con cámara:', error)
  }
}
```

### Opción 3: Subir a Supabase Storage

```typescript
import { cameraUploadManager } from './utils/camera-upload'

async function uploadCameraPhoto() {
  const videoElement = document.querySelector('video') as HTMLVideoElement
  const cameraManager = require('./utils/camera').cameraManager
  
  try {
    const blob = await cameraManager.capturePhotoAsync(videoElement)
    
    const result = await cameraUploadManager.uploadPhoto(
      blob,
      'solicitudes-distrito' // tu bucket en Supabase
    )
    
    if (result.success) {
      console.log('✅ URL pública:', result.url)
      console.log('📁 Ruta en bucket:', result.path)
    } else {
      console.error('❌ Error:', result.error)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
```

## 📱 Características Disponibles

### Captura Básica
```typescript
// Captura sincrónica (rápida pero bloqueante)
const blob = cameraManager.capturePhoto(videoElement)

// Captura asincrónica (no bloqueante, recomendado)
const blob = await cameraManager.capturePhotoAsync(videoElement)
```

### Alternar Cámaras
```typescript
// Cambiar de frontal a trasera y viceversa
const newFacing = await cameraManager.toggleCamera(videoElement, 'environment')
console.log('Cámara activa:', newFacing) // 'user' o 'environment'
```

### Verificar Cámaras Disponibles
```typescript
// ¿Hay múltiples cámaras?
const hasMultiple = await cameraManager.hasMultipleCameras()

// Obtener lista completa de cámaras
const cameras = await cameraManager.getAvailableCameras()
cameras.forEach(cam => {
  console.log(`${cam.label} - ID: ${cam.deviceId}`)
})
```

### Conversiones de Formato
```typescript
// Blob a File
const file = cameraManager.blobToFile(blob, 'mi-foto.jpg')

// Blob a Base64 (para preview o almacenamiento)
const base64 = await cameraManager.blobToBase64(blob)
document.querySelector('img').src = base64
```

## 🔐 Configuración de Supabase Storage

Asegúrate de que tu bucket en Supabase permita uploads:

```sql
-- En Supabase SQL, si es necesario:
UPDATE storage.buckets 
SET public = true 
WHERE name = 'solicitudes-distrito';
```

### RLS Policy para Photos
```sql
-- Permitir que usuarios autenticados suban
CREATE POLICY "Usuarios pueden subir fotos" ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'solicitudes-distrito');

-- Permitir lectura pública
CREATE POLICY "Fotos públicas" ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'solicitudes-distrito');
```

## 🌐 Instalación como PWA

### En Android (Chrome)
1. Abre la aplicación
2. Menu (⋮) → Instalar aplicación
3. Listo - aparecerá en tu pantalla de inicio

### En iOS (Safari 16+)
1. Abre la aplicación en Safari
2. Compartir → Añadir a pantalla de inicio
3. Listo - aparecerá en tu Home

### En Escritorio (Windows, Mac, Linux)
1. Chrome: Menu (⋮) → Instalar "Front Electoral"
2. Edge: Menu (⋮) → Instalar esta aplicación
3. Firefox: No soporta instalación pero cachea offline

## ⚙️ Configuración Avanzada

### Cambiar Resolución de Cámara
```typescript
await cameraManager.startCamera(videoElement, {
  facingMode: 'environment',
  width: 1920,   // Full HD
  height: 1080,
})
```

### Cambiar Formato de Imagen Capturada
```typescript
// JPEG (mejor compresión)
await cameraManager.capturePhotoAsync(videoElement, {
  format: 'image/jpeg',
  quality: 0.85
})

// PNG (sin pérdida)
await cameraManager.capturePhotoAsync(videoElement, {
  format: 'image/png'
})

// WebP (moderno)
await cameraManager.capturePhotoAsync(videoElement, {
  format: 'image/webp',
  quality: 0.8
})
```

### Desactivar Espejo de Cámara Frontal
```typescript
await cameraManager.startCamera(videoElement, {
  facingMode: 'user',
  mirror: false  // No invertir imagen
})
```

## 🐛 Troubleshooting

### "Permiso de cámara denegado"
- Usuario rechazó permisos en el navegador
- Solución: Ir a Configuración → Permisos → Cámara → Permitir

### "La cámara está siendo usada"
- Otra aplicación o ventana está usando la cámara
- Solución: Cerrar pestaña/app que usa cámara y refrescar

### "No se encontró cámara"
- El dispositivo no tiene cámara
- Solución: Usar en dispositivo con cámara

### PWA no se instala
- Asegúrate de:
  - Usar HTTPS (o localhost en desarrollo)
  - Manifest.json válido
  - Service Worker registrado
  - Iconos disponibles en `/public`

## 📊 Ejemplo Completo: Formulario con Cámara

```typescript
import { cameraUploadManager } from './utils/camera-upload'

function createSolicitudForm() {
  const form = document.createElement('form')
  
  // Sección de cámara
  const cameraSection = document.createElement('div')
  const ui = cameraUploadManager.createCameraUI()
  cameraSection.appendChild(ui.container)
  
  // Campo oculto para guardar URL de foto
  const photoUrlInput = document.createElement('input')
  photoUrlInput.type = 'hidden'
  photoUrlInput.name = 'foto_url'
  
  form.appendChild(cameraSection)
  form.appendChild(photoUrlInput)
  
  // Cuando se suba la foto, guardar URL
  ui.uploadButton.addEventListener('click', async () => {
    // La foto ya se subió automáticamente
    const imageUrl = ui.container.querySelector('img')?.src
    if (imageUrl) {
      photoUrlInput.value = imageUrl
      console.log('Foto lista para enviar en formulario')
    }
  })
  
  return form
}
```

## 📚 Referencias Útiles

- [MDN - mediaDevices.getUserMedia()](https://developer.mozilla.org/es/docs/Web/API/MediaDevices/getUserMedia)
- [MDN - Web Workers y Service Workers](https://developer.mozilla.org/es/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 💡 Pro Tips

1. **Cacheo inteligente**: El Service Worker cachea automáticamente scripts y estilos
2. **Permisos persistentes**: Una vez aceptado, iOS/Android recuerda el permiso
3. **Base64 para preview**: Usa `blobToBase64()` antes de subir para preview instantáneo
4. **Compresión**: JPEG con quality 0.7-0.8 es casi imperceptible pero 30% más pequeño
5. **Testing offline**: En DevTools → Network → selecciona "Offline" para probar

---

**¿Preguntas?** Revisa los logs en la consola (F12 → Console)
