/**
 * main.ts — Inicializador de la aplicación electoral
 * Responsabilidades MÍNIMAS: 
 * - Inicializar cliente Supabase
 * - Detectar ruta y rol del usuario
 * - Delegar renderizado a RoleRouter
 * - Manejar navegación global
 *
 * Líneas: ~125 (era ~3850 antes del refactoring)
 */

import './style.css'
import { supabase } from './utils/supabase'
import renderRole, { type RouteId, type RoleId } from './components/ElectoralApp/RoleRouter'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('No se encontro el contenedor #app')

// ─── ESTADO GLOBAL MÍNIMO ───────────────────────────────────────
// Nota: currentRoute y currentRole se mantienen en renderRoute()

// ─── UTILITARIOS ────────────────────────────────────────────────
function getRoute(): RouteId {
  const path = window.location.pathname
  if (path === '/login') return 'login'
  if (path === '/panel') return 'panel'
  if (path === '/admin') return 'admin'
  if (path === '/carrasco') return 'carrasco'
  return 'home'
}

function navigate(path: '/login' | '/' | '/panel' | '/admin' | '/carrasco') {
  window.history.pushState({}, '', path)
  renderRoute()
}

async function isLoggedIn(): Promise<{ loggedIn: boolean; role: RoleId | null }> {
  // Verificar sesión en Supabase Auth
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData?.session?.user) {
    window.localStorage.removeItem('authRole')
    return { loggedIn: false, role: null }
  }

  // Validar rol en tabla usuarios
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_id', sessionData.session.user.id)
    .eq('activo', true)
    .single()

  if (!userData) {
    window.localStorage.removeItem('authRole')
    await supabase.auth.signOut()
    return { loggedIn: false, role: null }
  }

  const role = userData.rol as RoleId
  window.localStorage.setItem('authRole', role)
  return { loggedIn: true, role }
}

async function renderRoute() {
  const route = getRoute()
  const { loggedIn, role } = await isLoggedIn()

  // Redirigir no autenticados a login
  if (route !== 'login' && !loggedIn) {
    navigate('/login')
    return
  }

  // Renderizar usando RoleRouter
  const view = await renderRole({
    route,
    role: role || 'veedor', // Default fallback
    onNavigate: (routeId: RouteId) => {
      // Convert RouteId to path for navigate
      const pathMap: Record<RouteId, '/login' | '/' | '/panel' | '/admin' | '/carrasco'> = {
        'login': '/login',
        'home': '/',
        'panel': '/panel',
        'admin': '/admin',
        'carrasco': '/carrasco'
      }
      navigate(pathMap[routeId])
    },
    onLogout: () => {
      window.localStorage.removeItem('authRole')
      navigate('/login')
    },
  })

  if (!view) {
    app!.innerHTML = '<div style="padding:20px;color:#c00;text-align:center;"><h2>Acceso denegado</h2><p>No tienes permiso para ver esta página.</p><button onclick="location.href=\'/login\'">Volver a login</button></div>'
    return
  }

  app!.innerHTML = ''
  app!.appendChild(view)
}

// ─── MANEJAR NAVEGACIÓN CON BOTONES data-go ────────────────────
document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-go]')
  if (target) {
    const path = target.dataset.go as '/login' | '/' | '/panel' | '/admin' | '/carrasco'
    navigate(path)
  }
})

// ─── MANEJAR BOTÓN ATRÁS DEL NAVEGADOR ─────────────────────────
window.addEventListener('popstate', () => {
  renderRoute()
})

// ─── INICIAR APLICACIÓN ───────────────────────────────────────
async function init() {
  try {
    // Cargar ruta inicial
    await renderRoute()
  } catch (err) {
    console.error('[init] Error:', err)
    app!.innerHTML = '<div style="padding:20px;color:#c00;"><h2>Error al inicializar la aplicación</h2><p>Por favor, recarga la página.</p></div>'
  }
}

init()
