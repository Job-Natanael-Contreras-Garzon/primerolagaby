/**
 * Módulo para integrar captura de cámara con subida a Supabase Storage
 * Proporciona UI y lógica para capturar desde cámara y almacenar en la nube
 */

import { supabase } from './supabase'
import { cameraManager, type CameraStream } from './camera'

export interface PhotoUploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

class CameraUploadManager {
  private currentCamera: CameraStream | null = null
  private currentFacing: 'user' | 'environment' = 'environment'

  /**
   * Crea la interfaz de captura de cámara
   */
  createCameraUI(): {
    container: HTMLElement
    videoElement: HTMLVideoElement
    startButton: HTMLButtonElement
    captureButton: HTMLButtonElement
    toggleButton: HTMLButtonElement
    uploadButton: HTMLButtonElement
  } {
    const container = document.createElement('div')
    container.className = 'camera-capture-container'
    container.style.cssText = `
      max-width: 100%;
      margin: 1rem 0;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `

    // Video
    const videoElement = document.createElement('video')
    videoElement.style.cssText = `
      width: 100%;
      height: auto;
      display: block;
      background: #000;
      max-height: 500px;
    `
    videoElement.playsInline = true

    // Canvas (oculto para preview)
    const canvas = document.createElement('canvas')
    canvas.style.display = 'none'

    // Preview de foto capturada
    const previewImage = document.createElement('img')
    previewImage.style.cssText = `
      width: 100%;
      height: auto;
      display: none;
      max-height: 500px;
      object-fit: contain;
    `

    // Botones
    const buttonContainer = document.createElement('div')
    buttonContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background: #1f2937;
      flex-wrap: wrap;
    `

    const startButton = document.createElement('button')
    startButton.textContent = '📷 Iniciar Cámara'
    startButton.style.cssText = `
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `

    const toggleButton = document.createElement('button')
    toggleButton.textContent = '🔄 Cambiar Cámara'
    toggleButton.style.cssText = `
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: none;
    `
    toggleButton.disabled = true

    const captureButton = document.createElement('button')
    captureButton.textContent = '📸 Capturar Foto'
    captureButton.style.cssText = `
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      background: #f59e0b;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: none;
    `
    captureButton.disabled = true

    const uploadButton = document.createElement('button')
    uploadButton.textContent = '☁️ Subir Imagen'
    uploadButton.style.cssText = `
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: none;
    `
    uploadButton.disabled = true

    // Estado
    let capturedBlob: Blob | null = null

    // Event listeners
    startButton.addEventListener('click', async () => {
      try {
        startButton.disabled = true
        startButton.textContent = '⏳ Iniciando...'

        await cameraManager.startCamera(videoElement, {
          facingMode: this.currentFacing,
          mirror: this.currentFacing === 'user',
        })

        this.currentCamera = {
          stream: videoElement.srcObject as MediaStream,
          videoElement,
          stop: () => cameraManager.stopCamera(),
        }

        videoElement.style.display = 'block'
        previewImage.style.display = 'none'
        captureButton.style.display = 'inline-block'
        captureButton.disabled = false
        startButton.style.display = 'none'

        const hasMultiple = await cameraManager.hasMultipleCameras()
        if (hasMultiple) {
          toggleButton.style.display = 'inline-block'
          toggleButton.disabled = false
        }

        startButton.textContent = '📷 Iniciar Cámara'
      } catch (error) {
        console.error('Error iniciando cámara:', error)
        startButton.disabled = false
        startButton.textContent = '❌ Error'
        alert(`Error: ${error instanceof Error ? error.message : 'No se pudo iniciar la cámara'}`)
      }
    })

    toggleButton.addEventListener('click', async () => {
      try {
        toggleButton.disabled = true
        this.currentFacing = await cameraManager.toggleCamera(
          videoElement,
          this.currentFacing
        )
        toggleButton.disabled = false
      } catch (error) {
        console.error('Error alternando cámara:', error)
        toggleButton.disabled = false
      }
    })

    captureButton.addEventListener('click', async () => {
      try {
        captureButton.disabled = true
        captureButton.textContent = '⏳ Capturando...'

        capturedBlob = await cameraManager.capturePhotoAsync(videoElement, {
          quality: 0.9,
          format: 'image/jpeg',
        })

        if (capturedBlob) {
          const reader = new FileReader()
          reader.onload = (e) => {
            previewImage.src = e.target?.result as string
            previewImage.style.display = 'block'
            videoElement.style.display = 'none'
            captureButton.textContent = '📸 Capturar Foto'
            uploadButton.style.display = 'inline-block'
            uploadButton.disabled = false

            // Agregar botón para retomar
            const retakeButton = document.createElement('button')
            retakeButton.textContent = '🔄 Retomar'
            retakeButton.style.cssText = `
              flex: 1;
              min-width: 120px;
              padding: 0.75rem 1rem;
              background: #ef4444;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
            `
            retakeButton.addEventListener('click', () => {
              previewImage.style.display = 'none'
              videoElement.style.display = 'block'
              uploadButton.style.display = 'none'
              captureButton.disabled = false
              captureButton.textContent = '📸 Capturar Foto'
              retakeButton.remove()
            })
            buttonContainer.appendChild(retakeButton)
          }
          reader.readAsDataURL(capturedBlob)
        }
      } catch (error) {
        console.error('Error capturando foto:', error)
        captureButton.disabled = false
        captureButton.textContent = '❌ Error'
        alert('Error al capturar foto')
      }
    })

    uploadButton.addEventListener('click', async () => {
      if (!capturedBlob) {
        alert('No hay foto capturada para subir')
        return
      }

      try {
        uploadButton.disabled = true
        uploadButton.textContent = '⏳ Subiendo...'

        const result = await this.uploadPhoto(capturedBlob, 'solicitudes-distrito')
        if (result.success) {
          uploadButton.textContent = '✅ Subida Exitosa'
          alert('Foto subida exitosamente')
          // Resetear
          setTimeout(() => {
            previewImage.style.display = 'none'
            videoElement.style.display = 'block'
            uploadButton.style.display = 'none'
            capturedBlob = null

          }, 2000)
        } else {
          uploadButton.textContent = '❌ Error'
          alert(`Error al subir: ${result.error}`)
        }
      } catch (error) {
        console.error('Error subiendo foto:', error)
        uploadButton.disabled = false
        uploadButton.textContent = '☁️ Subir Imagen'
      }
    })

    // Monitorear Estado de visibilidad (pausar cámara si tab no es activa)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentCamera) {
        cameraManager.stopCamera()
      }
    })

    buttonContainer.appendChild(startButton)
    buttonContainer.appendChild(toggleButton)
    buttonContainer.appendChild(captureButton)
    buttonContainer.appendChild(uploadButton)

    container.appendChild(videoElement)
    container.appendChild(previewImage)
    container.appendChild(canvas)
    container.appendChild(buttonContainer)

    return {
      container,
      videoElement,
      startButton,
      captureButton,
      toggleButton,
      uploadButton,
    }
  }

  /**
   * Sube una foto a Supabase Storage
   */
  async uploadPhoto(blob: Blob, bucket: string = 'solicitudes-distrito'): Promise<PhotoUploadResult> {
    try {
      const user = (await supabase.auth.getUser()).data.user

      if (!user) {
        return {
          success: false,
          error: 'No autenticado. Por favor inicia sesión.',
        }
      }

      const timestamp = Date.now()
      const filename = `${user.id}/${timestamp}-${Math.random().toString(36).substring(7)}.jpg`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (error) {
        console.error('Error subiendo a Storage:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename)

      return {
        success: true,
        url: publicData?.publicUrl,
        path: filename,
      }
    } catch (error) {
      console.error('Error en uploadPhoto:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  }

  /**
   * Limpia la cámara
   */
  cleanup(): void {
    if (this.currentCamera) {
      cameraManager.stopCamera()
      this.currentCamera = null
    }
  }
}

export const cameraUploadManager = new CameraUploadManager()
