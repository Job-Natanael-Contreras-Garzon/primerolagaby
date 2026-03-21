/**
 * Utility para manejo de cámara y captura de fotos
 */

let cameraStream: MediaStream | null = null

export async function startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    
    if (cameraStream && videoElement) {
      videoElement.srcObject = cameraStream
      return true
    }
    return false
  } catch (error) {
    console.error('❌ Error accediendo a cámara:', error)
    alert('No se pudo acceder a la cámara. Verifica los permisos.')
    return false
  }
}

export function stopCamera(): void {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop())
    cameraStream = null
  }
}

export function capturePhoto(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): string | null {
  try {
    const ctx = canvasElement.getContext('2d')
    
    if (!ctx) return null
    
    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    ctx.drawImage(videoElement, 0, 0)
    
    const photoData = canvasElement.toDataURL('image/jpeg', 0.8)
    return photoData
  } catch (error) {
    console.error('❌ Error capturando foto:', error)
    return null
  }
}

export function isMediaSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}
