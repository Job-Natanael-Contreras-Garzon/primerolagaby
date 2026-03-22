/**
 * Módulo para capturar fotos desde la cámara del dispositivo
 * Soporta cámaras frontal y trasera en dispositivos móviles
 */

export interface CameraOptions {
  facingMode?: 'user' | 'environment' // user = frontal, environment = trasera
  width?: number
  height?: number
  mirror?: boolean // Espejo para cámara frontal
}

export interface CameraStream {
  stream: MediaStream
  videoElement: HTMLVideoElement
  stop: () => void
}

class CameraManager {
  private currentStream: MediaStream | null = null

  /**
   * Solicita acceso a la cámara
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      // Verificar soporte
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu dispositivo no soporta acceso a cámara')
      }

      // Solicitar solo permisos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      // Detener inmediatamente después de verificar
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      console.error('Error al solicitar permisos de cámara:', error)
      return false
    }
  }

  /**
   * Inicia la visualización de la cámara en un elemento video
   */
  async startCamera(
    videoElement: HTMLVideoElement,
    options: CameraOptions = {}
  ): Promise<CameraStream> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu dispositivo no soporta acceso a cámara')
      }

      // Detener stream anterior si existe
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => track.stop())
      }

      const facingMode = options.facingMode || 'environment'
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: options.width ? { ideal: options.width } : undefined,
          height: options.height ? { ideal: options.height } : undefined,
        },
        audio: false,
      }

      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints)

      videoElement.srcObject = this.currentStream

      // Esperar a que el video esté listo
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch((error) => {
            console.warn('Error al reproducir video:', error)
          })
          resolve(null)
        }
      })

      // Aplicar espejo si es cámara frontal
      if (facingMode === 'user' && (options.mirror !== false)) {
        videoElement.style.transform = 'scaleX(-1)'
      } else {
        videoElement.style.transform = 'scaleX(1)'
      }

      return {
        stream: this.currentStream,
        videoElement,
        stop: () => this.stopCamera(),
      }
    } catch (error) {
      console.error('Error al iniciar cámara:', error)

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('No se encontró ninguna cámara en el dispositivo')
        } else if (error.name === 'NotReadableError') {
          throw new Error('La cámara ya está siendo utilizada por otra aplicación')
        }
      }

      throw error
    }
  }

  /**
   * Captura una foto del video actual
   */
  capturePhoto(
    videoElement: HTMLVideoElement,
    options: { quality?: number; format?: 'image/jpeg' | 'image/png' | 'image/webp' } = {}
  ): Blob | null {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('No se puede obtener contexto del canvas')
      }

      // Aplicar espejo si está aplicado
      if (videoElement.style.transform.includes('scaleX(-1)')) {
        ctx.scale(-1, 1)
        ctx.drawImage(videoElement, -canvas.width, 0)
      } else {
        ctx.drawImage(videoElement, 0, 0)
      }

      let blob: Blob | null = null
      const format = options.format || 'image/jpeg'
      const quality = options.quality ?? 0.9

      canvas.toBlob(
        (result) => {
          blob = result
        },
        format,
        quality
      )

      // Esperar a que se complete el blob
      const startTime = Date.now()
      while (blob === null && Date.now() - startTime < 5000) {
        // Espera corta
      }

      return blob
    } catch (error) {
      console.error('Error al capturar foto:', error)
      return null
    }
  }

  /**
   * Captura una foto de forma asíncrona
   */
  async capturePhotoAsync(
    videoElement: HTMLVideoElement,
    options: { quality?: number; format?: 'image/jpeg' | 'image/png' | 'image/webp' } = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se puede obtener contexto del canvas'))
          return
        }

        // Aplicar espejo si está aplicado
        if (videoElement.style.transform.includes('scaleX(-1)')) {
          ctx.scale(-1, 1)
          ctx.drawImage(videoElement, -canvas.width, 0)
        } else {
          ctx.drawImage(videoElement, 0, 0)
        }

        const format = options.format || 'image/jpeg'
        const quality = options.quality ?? 0.9

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('No se pudo generar la imagen'))
            }
          },
          format,
          quality
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Detiene la cámara y cierra el stream
   */
  stopCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.currentStream = null
    }
  }

  /**
   * Alterna entre cámara frontal y trasera
   */
  async toggleCamera(
    videoElement: HTMLVideoElement,
    currentFacing: 'user' | 'environment' = 'environment'
  ): Promise<'user' | 'environment'> {
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment'
    const options: CameraOptions = {
      facingMode: newFacing,
      mirror: newFacing === 'user',
    }

    await this.startCamera(videoElement, options)
    return newFacing
  }

  /**
   * Verifica si el dispositivo dispone de múltiples cámaras
   */
  async hasMultipleCameras(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((device) => device.kind === 'videoinput')
      return cameras.length > 1
    } catch (error) {
      console.error('Error verificando cámaras:', error)
      return false
    }
  }

  /**
   * Obtiene información de todas las cámaras disponibles
   */
  async getAvailableCameras(): Promise<
    Array<{ deviceId: string; label: string; kind: 'videoinput' | 'audioinput' }>
  > {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return []
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${device.deviceId.substring(0, 5)}`,
          kind: device.kind as 'videoinput',
        }))
    } catch (error) {
      console.error('Error obteniendo cámaras:', error)
      return []
    }
  }

  /**
   * Crea un archivo File a partir del Blob capturado
   */
  blobToFile(blob: Blob, filename: string = 'photo.jpg'): File {
    return new File([blob], filename, {
      type: blob.type,
      lastModified: Date.now(),
    })
  }

  /**
   * Convierte Blob a base64 (útil para preview o almacenamiento)
   */
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

// Instancia singleton
export const cameraManager = new CameraManager()
