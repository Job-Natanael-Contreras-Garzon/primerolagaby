/**
 * AdminView: Panel de administración del sistema
 * Orquesta 7 vistas administrativas
 *
 *Responsabilidades:
 * - Navegación entre vistas admin
 * - Carga inicial de datos (distritos, recintos, etc.)
 * - Delegación a subcomponentes
 *
 * Máx 250 líneas
 */

import { supabase } from '../../../utils/supabase'
import { useCatalogos } from '../shared/hooks'
import { type RouteId } from '../shared/types'
import {
  createAdminDashboard,
  createUserManagement,
  createDistritoManagement,
  createRecintoManagement,
  createMesaMonitoring,
  createImageGallery,
  createSystemConfig,
} from './../admin'

interface AdminViewProps {
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

export async function createAdminView({ onNavigate, onLogout }: AdminViewProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  const catalogos = await useCatalogos()

  container.innerHTML = getAdminTemplate()

  await bindAdminView(container, catalogos, onNavigate, onLogout)

  return container
}

function getAdminTemplate(): string {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">🔐 Administrador</p>
          <h1>Control Total</h1>
          <small>Sistema Electoral</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="dashboard" type="button">📊 Dashboard</button>
          <button class="menu-link" data-view="usuarios" type="button">👥 Usuarios</button>
          <button class="menu-link" data-view="distritos" type="button">🗺️ Distritos</button>
          <button class="menu-link" data-view="recintos" type="button">🏫 Recintos</button>
          <button class="menu-link" data-view="mesas" type="button">📋 Mesas</button>
          <button class="menu-link" data-view="imagenes" type="button">🖼️ Imágenes</button>
          <button class="menu-link" data-view="config" type="button">⚙️ Configuración</button>
        </nav>

        <div class="status-box">
          <p>Sistema</p>
          <strong>Activo</strong>
          <span>Todos los datos</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="admin-view-title">Dashboard</h2>
          
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            <button class="menu-tab is-active" data-view="dashboard" type="button">Dashboard</button>
            <button class="menu-tab" data-view="usuarios" type="button">Usuarios</button>
            <button class="menu-tab" data-view="distritos" type="button">Distritos</button>
            <button class="menu-tab" data-view="mesas" type="button">Mesas</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="admin-logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- VIEWS CONTAINER -->
        <div id="admin-views-container"></div>
      </main>
    </div>

    <!-- MODALS -->
    <div id="admin-modals-container"></div>
  `
}

async function bindAdminView(
  container: HTMLElement,
  catalogos: any,
  onNavigate: (route: RouteId) => void,
  onLogout: () => void
) {
  const viewTitle = container.querySelector<HTMLElement>('#admin-view-title')
  const viewsContainer = container.querySelector<HTMLElement>('#admin-views-container')
  const _modalsContainer = container.querySelector<HTMLElement>('#admin-modals-container')
  void _modalsContainer
  const menuLinks = container.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = container.querySelectorAll<HTMLButtonElement>('.menu-tab')

  // Crear vistas
  const viewsMap: { [key: string]: { create: () => Promise<HTMLElement>; title: string } } = {
    dashboard: {
      create: () => createAdminDashboard({ catalogos }),
      title: '📊 Dashboard',
    },
    usuarios: {
      create: () => createUserManagement({ catalogos, supabase }),
      title: '👥 Usuarios',
    },
    distritos: {
      create: () => createDistritoManagement({ catalogos, supabase }),
      title: '🗺️ Distritos',
    },
    recintos: {
      create: () => createRecintoManagement({ catalogos, supabase }),
      title: '🏫 Recintos',
    },
    mesas: {
      create: () => createMesaMonitoring({ catalogos }),
      title: '📋 Mesas',
    },
    imagenes: {
      create: () => createImageGallery(),
      title: '🖼️ Imágenes',
    },
    config: {
      create: () => createSystemConfig({}),
      title: '⚙️ Configuración',
    },
  }

  let currentView: string | null = null

  const showView = async (viewName: string) => {
    if (currentView === viewName) return
    if (!viewsMap[viewName]) return

    // Actualizar UI de navegación
    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    const activeLink = container.querySelector<HTMLButtonElement>(`.menu-link[data-view="${viewName}"]`)
    const activeTab = container.querySelector<HTMLButtonElement>(`.menu-tab[data-view="${viewName}"]`)
    if (activeLink) activeLink.classList.add('is-active')
    if (activeTab) activeTab.classList.add('is-active')

    // Actualizar título
    if (viewTitle) viewTitle.textContent = viewsMap[viewName].title

    // Renderizar nueva vista
    if (viewsContainer) {
      viewsContainer.innerHTML = '' // Limpiar anterior
      const view = await viewsMap[viewName].create()
      viewsContainer.appendChild(view)
    }

    currentView = viewName
  }

  // Attach listeners
  menuLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view || 'dashboard'
      showView(viewName)
    })
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view || 'dashboard'
      showView(viewName)
    })
  })

  // Logout
  const logoutBtn = container.querySelector<HTMLButtonElement>('#admin-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout)
  }

  // Ir a reportar button
  const goReportBtn = container.querySelector<HTMLButtonElement>('[data-go="/"]')
  if (goReportBtn) {
    goReportBtn.addEventListener('click', () => onNavigate('home'))
  }

  // Mostrar vista inicial
  await showView('dashboard')
}

export default createAdminView
