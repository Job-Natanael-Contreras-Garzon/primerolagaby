/**
 * INTEGRACIÓN SIMPLE DE CÁMARA - FUNCIONA EN NAVEGADOR Y PWA
 * 
 * Este archivo muestra cómo integrar la cámara de manera simple y efectiva
 * tanto en navegador de escritorio como en app PWA en dispositivos móviles
 */

/**
 * Importa dinámicamente los módulos de cámara solo cuando sea necesario
 * Esto evita errores en compilación y permite lazy-loading
 */

/**
 * INTEGRACIÓN 1: Para usar en tu aplicación principal (main.ts)
 * 
 * Agregá esto donde quieras mostrar la cámara:
 */
export async function initializeCameraModule() {
  try {
    const { cameraUploadManager } = await import('./camera-upload')
    const { cameraManager } = await import('./camera')
    
    return { cameraUploadManager, cameraManager }
  } catch (error) {
    console.error('Error al cargar módulos de cámara:', error)
    throw error
  }
}

/**
 * INTEGRACIÓN 2: Crear sección de cámara para veedores
 * 
 * Uso:
 * const section = await createVeeedorCameraSection()
 * document.querySelector('#container').appendChild(section)
 */
export async function createVeeedorCameraSection(_options?: { 
  enableAlternateCamera?: boolean 
}): Promise<HTMLElement> {
  const { cameraUploadManager } = await import('./camera-upload')
  
  const section = document.createElement('section')
  section.className = 'veeedor-camera-section'
  section.style.cssText = `
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    background: #f0f9ff;
  `

  // Información
  const info = document.createElement('div')
  info.innerHTML = `
    <h3 style="margin-top: 0; color: #1f2937;">📸 Documentar Solicitud con Foto</h3>
    <p style="color: #666; font-size: 0.875rem; margin: 0.5rem 0;">
      Captura una foto del documento o situación que necesitas documentar.
      La foto se guardará automáticamente en la nube.
    </p>
  `
  section.appendChild(info)

  // Crear UI de cámara
  const cameraUI = cameraUploadManager.createCameraUI()
  section.appendChild(cameraUI.container)

  return section
}

/**
 * INTEGRACIÓN 3: Formulario con cámara (Para solicitudes del veedor)
 * 
 * Uso:
 * const form = await createSolicitudFormWithCamera()
 * document.querySelector('#form-container').appendChild(form)
 */
export async function createSolicitudFormWithCamera(options?: {
  title?: string
  submitButtonText?: string
  onSubmit?: (data: any) => Promise<void>
}): Promise<HTMLElement> {
  const { cameraUploadManager } = await import('./camera-upload')
  
  const form = document.createElement('form')
  form.style.cssText = `
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `

  // Título
  const title = document.createElement('h2')
  title.textContent = options?.title || '📝 Envío de Solicitud con Documentación'
  title.style.cssText = 'margin-top: 0; color: #1f2937; text-align: center;'
  form.appendChild(title)

  // Campo de descripción
  const descLabel = document.createElement('label')
  descLabel.textContent = 'Descripción:'
  descLabel.style.cssText = 'display: block; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; color: #374151;'
  form.appendChild(descLabel)

  const descInput = document.createElement('textarea')
  descInput.name = 'description'
  descInput.placeholder = 'Describe qué necesitas documentar...'
  descInput.style.cssText = `
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.875rem;
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
  `
  form.appendChild(descInput)

  // Sección de cámara con label
  const cameraLabel = document.createElement('label')
  cameraLabel.textContent = 'Capturar Foto:'
  cameraLabel.style.cssText = 'display: block; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; color: #374151;'
  form.appendChild(cameraLabel)

  // UI de cámara
  const cameraUI = cameraUploadManager.createCameraUI()
  form.appendChild(cameraUI.container)

  // Campo oculto para guardar URL
  const photoUrlInput = document.createElement('input')
  photoUrlInput.type = 'hidden'
  photoUrlInput.name = 'photo_url'

  // Campo oculto para estado
  const photoStatusInput = document.createElement('input')
  photoStatusInput.type = 'hidden'
  photoStatusInput.name = 'photo_uploaded'
  photoStatusInput.value = 'false'

  form.appendChild(photoUrlInput)
  form.appendChild(photoStatusInput)

  // Botón de envío
  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.textContent = options?.submitButtonText || '✅ Enviar Solicitud'
  submitBtn.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    margin-top: 1.5rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 1rem;
  `

  submitBtn.addEventListener('mouseover', () => (submitBtn.style.background = '#047857'))
  submitBtn.addEventListener('mouseout', () => (submitBtn.style.background = '#059669'))

  form.appendChild(submitBtn)

  // Guardar URL cuando se suba foto
  cameraUI.uploadButton.addEventListener('click', async () => {
    setTimeout(() => {
      const preview = cameraUI.container.querySelector('img') as HTMLImageElement
      if (preview && preview.style.display !== 'none') {
        photoUrlInput.value = preview.src
        photoStatusInput.value = 'true'
        submitBtn.style.background = '#16a34a' // Verde más brillante
      }
    }, 3000)
  })

  // Manejar envío
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const description = descInput.value.trim()
    const photoUrl = photoUrlInput.value
    const photoUploaded = photoStatusInput.value === 'true'

    // Validación
    if (!description) {
      alert('⚠️ Por favor ingresa una descripción')
      descInput.focus()
      return
    }

    if (!photoUploaded) {
      alert('⚠️ Por favor captura y sube una foto antes de enviar')
      return
    }

    const formData = {
      description,
      photo_url: photoUrl,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    }

    try {
      // Ejecutar callback si existe
      if (options?.onSubmit) {
        await options.onSubmit(formData)
      } else {
        console.log('📤 Solicitud lista para enviar:', formData)
        alert('✅ Solicitud preparada exitosamente. Enviando...')
      }

      // Resetear formulario
      form.reset()
      photoUrlInput.value = ''
      photoStatusInput.value = 'false'
      submitBtn.style.background = '#059669'
    } catch (error) {
      console.error('Error enviando solicitud:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Desconocido'}`)
    }
  })

  return form
}

/**
 * INTEGRACIÓN 4: Solo captura (sin UI automática)
 * 
 * Uso:
 * const { cameraManager } = await initializeCameraModule()
 * const blob = await cameraManager.capturePhotoAsync(videoElement)
 */

/**
 * INTEGRACIÓN 5: Montar en elemento específico
 * 
 * Uso:
 * await mountCameraToElement('#my-container', { autoStart: true })
 */
export async function mountCameraToElement(
  selector: string,
  options?: { autoStart?: boolean; title?: string }
): Promise<void> {
  const container = document.querySelector(selector)
  if (!container) {
    throw new Error(`No se encontró elemento con selector: ${selector}`)
  }

  const section = await createVeeedorCameraSection()
  
  if (options?.title) {
    const titleEl = section.querySelector('h3')
    if (titleEl) titleEl.textContent = options.title
  }

  container.appendChild(section)

  if (options?.autoStart) {
    const startBtn = section.querySelector('button') as HTMLButtonElement
    if (startBtn) startBtn.click()
  }
}

/**
 * INTEGRACIÓN 6: Verificar soporte de cámara
 */
export async function checkCameraSupport(): Promise<{
  supported: boolean
  hasMultipleCameras: boolean
  cameras: Array<{ deviceId: string; label: string }>
}> {
  try {
    const { cameraManager } = await import('./camera')

    const supported = !!(navigator.mediaDevices?.getUserMedia)
    const hasMultipleCameras = await cameraManager.hasMultipleCameras()
    const cameras = await cameraManager.getAvailableCameras()

    return { supported, hasMultipleCameras, cameras }
  } catch (error) {
    return { supported: false, hasMultipleCameras: false, cameras: [] }
  }
}
