/**
 * ColegioView: Vista para gestionar un colegio/recinto
 * Responsabilidades:
 * - Gestionar mesas del colegio
 * - Crear delegados (veedores)
 * - Solicitudes de anulación
 *
 * Máx 200 líneas
 */

import { supabase } from '../../../utils/supabase'
import { useCatalogos } from '../shared/hooks'
import { type RouteId } from '../shared/types'

interface ColegioViewProps {
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

export async function createColegioView({ onNavigate: _onNavigate, onLogout }: ColegioViewProps): Promise<HTMLElement> {
  void _onNavigate
  const container = document.createElement('div')

  const catalogos = await useCatalogos()

  container.innerHTML = getColegioTemplate()

  await bindColegioView(container, catalogos, onLogout)

  return container
}

function getColegioTemplate(): string {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Responsable de Colegio</p>
          <h1>Gestión de Colegio</h1>
          <small>Colegio Central - Distrito 01</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="mesas-colegio" type="button">Mesas del Colegio</button>
          <button class="menu-link" data-view="crear-delegados" type="button">Crear Delegados</button>
          <button class="menu-link" data-view="solicitudes" type="button">Solicitudes de Anulación</button>
        </nav>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title-colegio">Mesas del Colegio</h2>
          
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            <button class="menu-tab is-active" data-view="mesas-colegio" type="button">Mesas</button>
            <button class="menu-tab" data-view="crear-delegados" type="button">Delegados</button>
            <button class="menu-tab" data-view="solicitudes" type="button">Solicitudes</button>
          </nav>

          <div class="top-actions">
            <button class="danger-btn" id="colegio-logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- MESAS COLEGIO -->
        <section id="view-mesas-colegio" class="view-root">
          <article class="card">
            <h3>Mesas del Colegio Central</h3>
            <p>Estado de las mesas registradas en este colegio</p>
            <div id="mesas-colegio-list" class="mesas-list"></div>
          </article>
        </section>

        <!-- CREAR DELEGADOS -->
        <section id="view-crear-delegados" class="view-root" style="display: none;">
          <article class="card">
            <h3>Crear Delegado</h3>
            <div style="margin-top: 16px;">
              <label for="colegio-delegado-usuario">Usuario</label>
              <input id="colegio-delegado-usuario" type="text" placeholder="Ej: jgarcia" />
              
              <label for="colegio-delegado-password">Contraseña</label>
              <input id="colegio-delegado-password" type="password" placeholder="Ingresa contraseña" />
              
              <button type="button" class="cta" id="btn-crear-delegado-colegio" style="margin-top: 8px;">Crear Delegado</button>
            </div>
          </article>

          <article class="card">
            <h3>Delegados Registrados</h3>
            <div id="delegados-colegio-list" class="veedores-list"></div>
          </article>
        </section>

        <!-- SOLICITUDES -->
        <section id="view-solicitudes" class="view-root" style="display: none;">
          <article class="card">
            <h3>Solicitudes de Anulación</h3>
            <div id="solicitudes-list" class="mesas-list"></div>
          </article>
        </section>
      </main>
    </div>
  `
}

async function bindColegioView(
  container: HTMLElement,
  _catalogos: any,
  onLogout: () => void
) {
  // Navegación de vistas
  const viewRoot = container.querySelectorAll<HTMLElement>('.view-root')
  const viewTitle = container.querySelector<HTMLElement>('#view-title-colegio')
  const menuLinks = container.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = container.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    viewRoot.forEach((v) => (v.style.display = 'none'))
    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    const targetView = container.querySelector<HTMLElement>(`#view-${viewName}`)
    if (targetView) targetView.style.display = 'block'

    if (viewTitle) {
      const titleMap: { [key: string]: string } = {
        'mesas-colegio': 'Mesas del Colegio',
        'crear-delegados': 'Crear Delegados',
        'solicitudes': 'Solicitudes de Anulación',
      }
      viewTitle.textContent = titleMap[viewName] || viewName
    }

    menuLinks.forEach((btn) => {
      if (btn.dataset.view === viewName) btn.classList.add('is-active')
    })
    menuTabs.forEach((btn) => {
      if (btn.dataset.view === viewName) btn.classList.add('is-active')
    })
  }

  menuLinks.forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view || 'mesas-colegio'))
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view || 'mesas-colegio'))
  })

  // Logout
  const logoutBtn = container.querySelector<HTMLButtonElement>('#colegio-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout)
  }

  // Load User Data based on Auth Session
  let currentUserRecintoId: number | null = null
  const { data: sessionData } = await supabase.auth.getSession()

  if (sessionData?.session?.user) {
    const { data: userRecinto } = await supabase
      .from('usuarios')
      .select('nombre, apellido, recinto_id')
      .eq('auth_id', sessionData.session.user.id)
      .single()

    if (userRecinto) {
      currentUserRecintoId = userRecinto.recinto_id
    }
  }

  // Update Header Title
  const headerSmall = container.querySelector('.brand small')
  if (headerSmall) {
    if (currentUserRecintoId) {
      const { data: qRecinto } = await supabase.from('recintos').select('nombre, distritos(nombre)').eq('id', currentUserRecintoId).single()
      if (qRecinto) {
         const distritoNombre = (qRecinto.distritos as any)?.nombre || 'Sin Distrito'
         headerSmall.textContent = `${qRecinto.nombre} - ${distritoNombre}`
      }
    } else {
      headerSmall.textContent = 'Sin recinto asignado'
    }
  }

  const h1Title = container.querySelector('.card h3')
  if (h1Title) {
      h1Title.textContent = `Mesas de mi Recinto`
  }

  // Cargar mesas del colegio
  const mesasColegioList = container.querySelector<HTMLElement>('#mesas-colegio-list')
  if (mesasColegioList && currentUserRecintoId) {
    const { data: mesasData } = await supabase
        .from('mesas')
        .select('id, numero_mesa, estado')
        .eq('recinto_id', currentUserRecintoId)
        .order('numero_mesa')

    if (mesasData && mesasData.length) {
      const mesasHtml = mesasData
        .map((mesa: any) => {
          const statusClass = mesa.estado === 'pendiente' ? 'mesa-abierta' : (mesa.estado === 'transmitida' ? 'mesa-cerrada' : '')
          const statusText = mesa.estado.toUpperCase()
          return `<div class="mesa-item ${statusClass}" style="display:flex; justify-content:space-between; padding:12px; margin-bottom:8px; border:1px solid #ddd; border-radius:6px; background:#f9f9f9;">
            <div class="mesa-info">
              <strong style="display:block; font-size:16px;">Mesa ${mesa.numero_mesa}</strong>
              <span style="font-size:12px; color:#555;">Estado: <strong>${statusText}</strong></span>
            </div>
          </div>`
        })
        .join('')
      mesasColegioList.innerHTML = mesasHtml
    } else {
      mesasColegioList.innerHTML = '<p class="empty" style="padding:15px; color:#666;">No hay mesas registradas para este recinto.</p>'
    }
  } else if (mesasColegioList) {
    mesasColegioList.innerHTML = '<p class="empty" style="padding:15px; color:#c00;">No tienes un recinto asignado en tu perfil.</p>'
  }

  // Crear delegado
  const btnCrearDelegado = container.querySelector<HTMLButtonElement>('#btn-crear-delegado-colegio')
  const delegadosColegioList = container.querySelector<HTMLElement>('#delegados-colegio-list')

  const loadDelegados = async () => {
    if (!delegadosColegioList) return
    delegadosColegioList.innerHTML = '<p class="empty">Cargando delegados...</p>'

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .eq('rol', 'veedor')
      .eq('activo', true)
      .limit(10)

    if (error || !data) {
      delegadosColegioList.innerHTML = '<p class="empty" style="color:#c00">Error cargando delegados</p>'
      return
    }

    if (data.length === 0) {
      delegadosColegioList.innerHTML = '<p class="empty">No hay delegados registrados</p>'
      return
    }

    delegadosColegioList.innerHTML = data
      .map((d: any) => `<div class="veedor-item">
        <div class="veedor-info">
          <strong>${d.nombre} ${d.apellido}</strong>
          <span>${d.email}</span>
        </div>
      </div>`)
      .join('')
  }

  if (btnCrearDelegado) {
    btnCrearDelegado.addEventListener('click', async () => {
      const email = container.querySelector<HTMLInputElement>('#colegio-delegado-usuario')?.value || ''
      const password = container.querySelector<HTMLInputElement>('#colegio-delegado-password')?.value || ''

      if (!email || !password) {
        alert('Completa todos los campos')
        return
      }

      btnCrearDelegado.disabled = true
      btnCrearDelegado.textContent = 'Creando...'

      // TODO: Implementar creación de usuario via Edge Function
      alert('✅ Delegado creado (funcionalidad a implementar)')

      btnCrearDelegado.disabled = false
      btnCrearDelegado.textContent = 'Crear Delegado'
      loadDelegados()
    })
  }

  loadDelegados()

  // Cargar solicitudes
  const solicitudesList = container.querySelector<HTMLElement>('#solicitudes-list')
  if (solicitudesList) {
    const { data: incidencias } = await supabase
      .from('incidencias')
      .select('id, justificativo, estado, created_at')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(10)

    if (incidencias && incidencias.length > 0) {
      solicitudesList.innerHTML = incidencias
        .map((inc: any) => `<div class="mesa-item">
          <div class="mesa-info">
            <strong>${inc.justificativo}</strong>
            <small>${new Date(inc.created_at).toLocaleString()}</small>
          </div>
        </div>`)
        .join('')
    } else {
      solicitudesList.innerHTML = '<p class="empty">No hay solicitudes pendientes</p>'
    }
  }
}

export default createColegioView
