const CACHE_NAME = 'electoral-pwa-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/favicon.svg',
]

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('Algunos activos no pudieron ser cacheados:', error)
        return Promise.resolve()
      })
    })
  )
  self.skipWaiting()
})

// Activar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Estrategia de fetch: Network First, luego Cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Excluir solicitudes a Supabase y APIs externas
  if (url.hostname !== 'localhost' && url.hostname !== self.location.hostname) {
    return
  }

  // Para navegación a documentos HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear en background
          if (response && response.status === 200) {
            const clonedResponse = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Offline - Página no disponible', { status: 503 })
          })
        })
    )
    return
  }

  // Para recursos (JS, CSS, imágenes)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === ''
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clonedResponse = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clonedResponse)
              })
            }
            return response
          })
          .catch(() => {
            // Fallback para imágenes si no está disponible
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999" font-size="12">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              )
            }
          })
      })
    )
    return
  }

  // Para API calls (GET de lectura)
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clonedResponse = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response(JSON.stringify({ error: 'Offline' }), { status: 503 })
          })
        })
    )
    return
  }

  // Para POST/PUT/DELETE (sin cacheo)
  event.respondWith(fetch(request))
})

// Manejo de mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true })
    })
  }
})
