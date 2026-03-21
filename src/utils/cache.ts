// ─── SISTEMA DE CACHÉ LOCAL ────────────────────────────────────────────────
// Almacena datos en localStorage con TTL (time to live) configurable

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // en milisegundos
}

export const cache = {
  // Guardar datos en caché
  set<T>(key: string, data: T, ttlMinutes = 5): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    }
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
    } catch (e) {
      console.warn('Cache set error:', e)
    }
  },

  // Obtener datos del caché (si no expiró)
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`cache_${key}`)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)
      const now = Date.now()

      // Verificar si el caché expiró
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      return entry.data
    } catch (e) {
      console.warn('Cache get error:', e)
      return null
    }
  },

  // Limpiar un caché específico
  remove(key: string): void {
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (e) {
      console.warn('Cache remove error:', e)
    }
  },

  // Limpiar todos los cachés
  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.warn('Cache clear error:', e)
    }
  },
}
