import './style.css'
import { supabase } from './utils/supabase'
import { cache } from './utils/cache'
import { excelHandler } from './utils/excel-handler'
import { chartManager } from './utils/apexcharts-manager'
import { pagination } from './utils/pagination'
import { loginTemplate } from './templates/login'
import { bindLogin } from './bindings/login'
import { veedorTemplate, bindVeedor } from './roles/veedor'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor #app')
}

const rootApp = app

type RouteId = 'home' | 'login' | 'panel' | 'admin' | 'carrasco'
type RoleId = 'veedor' | 'distrito' | 'colegio' | 'admin' | 'lector'

// ═══════════════════════════════════════════════════════════════════════════
// SHARED GLOBAL STATE (Cargado una sola vez al iniciar)
// ═══════════════════════════════════════════════════════════════════════════

let colegiosMock: { nombre: string; distrito: string; recinto_id?: number }[] = []
let partidos: { id: number; nombre: string; sigla: string; color: string }[] = []
let cargos: { id: number; nombre: string }[] = [
  { id: 1, nombre: 'Alcalde' },
  { id: 2, nombre: 'Concejal' },
]
let candidatos: { id: number; nombre: string; partido_id: number; cargo_id: number }[] = []
let mesas: { id: number; numero: string; colegio: string; distrito: string; estado: string }[] = []

async function loadCatalogos() {
  try {
    const { data: recintos } = await supabase
      .from('recintos')
      .select('id, nombre, distritos(nombre)')
      .eq('activo', true)

    if (recintos) {
      colegiosMock = recintos.map((r: any) => ({
        nombre: r.nombre,
        distrito: r.distritos?.nombre ?? 'Sin distrito',
        recinto_id: r.id,
      }))
    }

    const { data: partData } = await supabase
      .from('partidos')
      .select('id, nombre, sigla, color_hex')
      .eq('activo', true)

    if (partData) {
      partidos = partData.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        sigla: p.sigla,
        color: p.color_hex ?? '#888888',
      }))
    }

    const { data: mesasData } = await supabase
      .from('mesas')
      .select('id, numero_mesa, estado, recintos(nombre, distritos(nombre))')
      .eq('activo', true)

    if (mesasData) {
      mesas = mesasData.map((m: any) => ({
        id: m.id,
        numero: m.numero_mesa,
        colegio: m.recintos?.nombre ?? 'Sin recinto',
        distrito: m.recintos?.distritos?.nombre ?? 'Sin distrito',
        estado: m.estado,
      }))
    }
  } catch (err) {
    console.error('[Supabase] Error cargando catálogos:', err)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING & NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

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

async function isLoggedIn(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData?.session?.user) {
    window.localStorage.removeItem('authRole')
    return false
  }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_id', sessionData.session.user.id)
    .eq('activo', true)
    .single()

  if (!userData) {
    window.localStorage.removeItem('authRole')
    await supabase.auth.signOut()
    return false
  }

  window.localStorage.setItem('authRole', userData.rol)
  return true
}

async function renderRoute() {
  const route = getRoute()
  let html = ''
  let bindingCallback: (() => void) | null = null

  if (route === 'login') {
    html = loginTemplate()
    bindingCallback = bindLogin
  } else if (route === 'home') {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      navigate('/login')
      return
    }
    const role = window.localStorage.getItem('authRole') as RoleId | null
    if (role === 'veedor') {
      html = veedorTemplate()
      bindingCallback = bindVeedor
    } else {
      navigate('/panel')
      return
    }
  } else if (route === 'carrasco') {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      navigate('/login')
      return
    }
    const role = window.localStorage.getItem('authRole') as RoleId | null
    if (role !== 'lector') {
      navigate('/panel')
      return
    }
    // TODO: Implementar lector dashboard template y binding
    html = '<div class="shell"><main><p>🔄 Lector dashboard en desarrollo...</p></main></div>'
  } else if (route === 'panel' || route === 'admin') {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      navigate('/login')
      return
    }
    // TODO: Implementar admin/panel templates y bindings
    html = '<div class="shell"><main><p>🔄 Panel en desarrollo...</p></main></div>'
  }

  rootApp.innerHTML = html

  // Ejecutar binding al final
  if (bindingCallback) {
    bindingCallback()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

// Navegación con botones data-go
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const btn = target.closest<HTMLButtonElement>('[data-go]')
  if (btn) {
    const path = btn.dataset.go as any
    navigate(path)
  }
})

// Navigation con popstate (botón atrás del navegador)
window.addEventListener('popstate', renderRoute)

// Emit custom 'routechange' event listener
window.addEventListener('routechange', renderRoute)

// Al cargar, si no está en login y no está logueado, ir a login
window.addEventListener('load', async () => {
  await loadCatalogos()
  const route = getRoute()
  if (route !== 'login') {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      navigate('/login')
      return
    }
  }
  renderRoute()
})

// Export globals para debugging
(window as any).supabase = supabase
(window as any).navigate = navigate
(window as any).colegiosMock = colegiosMock
(window as any).partidos = partidos
(window as any).cargos = cargos
(window as any).mesas = mesas
