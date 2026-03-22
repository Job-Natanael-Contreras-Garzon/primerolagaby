/**
 * EJEMPLO: Cómo integrar captura de cámara en tu aplicación
 * 
 * Copía y adapta el código según tus necesidades
 */

import { cameraUploadManager } from './camera-upload'
import { cameraManager } from './camera'

/**
 * Ejemplo 1: Añadir sección de cámara a un formulario
 */
export function createFormWithCamera() {
  const form = document.createElement('form')
  form.className = 'camera-form'

  // Título
  const title = document.createElement('h2')
  title.textContent = '📸 Envío de Solicitud con Foto'
  form.appendChild(title)

  // Campo de descripción
  const descLabel = document.createElement('label')
  descLabel.textContent = 'Descripción de la solicitud:'
  const descInput = document.createElement('textarea')
  descInput.name = 'description'
  descInput.placeholder = 'Describe lo que necesitas documentar...'
  descInput.style.cssText = 'width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ccc; border-radius: 4px;'
  form.appendChild(descLabel)
  form.appendChild(descInput)

  // Sección de cámara
  const cameraUI = cameraUploadManager.createCameraUI()
  form.appendChild(cameraUI.container)

  // Campo oculto para guardar URL de foto
  const photoUrlInput = document.createElement('input')
  photoUrlInput.type = 'hidden'
  photoUrlInput.name = 'photo_url'

  // Botón de envío
  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.textContent = '✅ Enviar Solicitud'
  submitBtn.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    margin-top: 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  `

  form.appendChild(photoUrlInput)
  form.appendChild(submitBtn)

  // Manejar envío
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!photoUrlInput.value) {
      alert('Por favor captura y sube una foto antes de enviar')
      return
    }

    const formData = {
      description: descInput.value,
      photo_url: photoUrlInput.value,
      timestamp: new Date().toISOString(),
    }

    console.log('Enviando solicitud:', formData)
    alert('✅ Solicitud enviada exitosamente')
  })

  // Guardar URL cuando se suba foto
  const originalUploadClick = cameraUI.uploadButton.onclick
  cameraUI.uploadButton.addEventListener('click', async () => {
    // El upload se hace automáticamente desde camera-upload.ts
    // Solo necesitamos guardar la URL cuando esté lista
    setTimeout(() => {
      const preview = cameraUI.container.querySelector('img') as HTMLImageElement
      if (preview && preview.style.display !== 'none') {
        photoUrlInput.value = preview.src
      }
    }, 3000) // Esperar a que se complete el upload
  })

  return form
}

/**
 * Ejemplo 2: Captura de cámara simple sin UI
 */
export async function capturePhotoSimple(videoElement: HTMLVideoElement): Promise<File | null> {
  try {
    // Pedir permisos
    const hasPermission = await cameraManager.requestCameraPermission()
    if (!hasPermission) {
      console.error('Permisos de cámara no otorgados')
      return null
    }

    // Iniciar cámara
    await cameraManager.startCamera(videoElement, {
      facingMode: 'environment',
    })

    // Esperar a que usuario presione capturar (manejar externamente)
    // ...

    // Capturar
    const blob = await cameraManager.capturePhotoAsync(videoElement)
    const file = cameraManager.blobToFile(blob, `photo-${Date.now()}.jpg`)

    // Detener cámara
    cameraManager.stopCamera()

    return file
  } catch (error) {
    console.error('Error en capturePhotoSimple:', error)
    return null
  }
}

/**
 * Ejemplo 3: Usar en modal/diálogo
 */
export function createCameraModal(): {
  modal: HTMLElement
  show: () => void
  hide: () => void
  getPhotoUrl: () => string | null
} {
  const modal = document.createElement('div')
  modal.className = 'camera-modal'
  modal.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    justify-content: center;
    align-items: center;
  `

  const content = document.createElement('div')
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  `

  const title = document.createElement('h3')
  title.textContent = '📷 Capturar Foto'
  content.appendChild(title)

  const ui = cameraUploadManager.createCameraUI()
  content.appendChild(ui.container)

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕ Cerrar'
  closeBtn.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    margin-top: 1rem;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  `
  content.appendChild(closeBtn)

  modal.appendChild(content)

  let photoUrl = ''

  const show = () => {
    modal.style.display = 'flex'
  }

  const hide = () => {
    modal.style.display = 'none'
    cameraManager.stopCamera()
  }

  const getPhotoUrl = () => photoUrl

  closeBtn.addEventListener('click', hide)

  // Guardar URL de foto subida
  ui.uploadButton.addEventListener('click', async () => {
    setTimeout(() => {
      const preview = ui.container.querySelector('img') as HTMLImageElement
      if (preview && preview.style.display !== 'none') {
        photoUrl = preview.src
      }
    }, 3000)
  })

  return { modal, show, hide, getPhotoUrl }
}

/**
 * Ejemplo 4: Integrar en flujo de "veedor" para documentación
 */
export function createVeeredorPhotoSection() {
  const section = document.createElement('section')
  section.className = 'veeedor-photo-section'
  section.style.cssText = `
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    background: #f0f9ff;
  `

  const info = document.createElement('div')
  info.innerHTML = `
    <h3>📸 Documentar con Foto</h3>
    <p style="color: #666; font-size: 0.875rem;">
      Captura una foto con tu cámara para documentar la solicitud.
      La foto se guardará automáticamente en la nube.
    </p>
  `
  section.appendChild(info)

  const ui = cameraUploadManager.createCameraUI()
  section.appendChild(ui.container)

  return section
}

/**
 * Ejemplo 5: Batch upload de múltiples fotos
 */
export async function captureBatchPhotos(count: number): Promise<Array<{ file: File; url?: string }>> {
  const results: Array<{ file: File; url?: string }> = []
  const videoElement = document.createElement('video')
  videoElement.style.display = 'none'
  document.body.appendChild(videoElement)

  try {
    for (let i = 0; i < count; i++) {
      const blob = await cameraManager.capturePhotoAsync(videoElement, {
        quality: 0.85,
        format: 'image/jpeg',
      })

      const file = cameraManager.blobToFile(blob, `batch-${i + 1}.jpg`)

      // Opcionalmente subir automáticamente
      const uploadResult = await cameraUploadManager.uploadPhoto(blob)

      results.push({
        file,
        url: uploadResult.success ? uploadResult.url : undefined,
      })

      console.log(`Foto ${i + 1}/${count} capturada`)
    }

    cameraManager.stopCamera()
    return results
  } catch (error) {
    console.error('Error en batch capture:', error)
    return results
  } finally {
    videoElement.remove()
  }
}

// Exportar funciones de utilidad
export { cameraManager, cameraUploadManager }
