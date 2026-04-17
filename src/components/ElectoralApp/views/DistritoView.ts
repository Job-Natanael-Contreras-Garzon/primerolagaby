/**
 * DistritoView: Vista para supervisores de distrito
 * También usada por admin cuando accede a panel
 * Responsabilidades:
 * - Búsqueda y supervisión de mesas
 * - Gestión de delegados
 * - Reportes de votos
 *
 * Máx 300 líneas
 */

import { supabase } from '../../../utils/supabase'
import { useCatalogos } from '../shared/hooks'
import { type RouteId } from '../shared/types'
import { useRealtimeChannel } from '../shared/hooks/useRealtimeChannel'

interface DistritoViewProps {
  role: 'distrito' | 'admin'
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

let distritoUnsubscribe: (() => void) | null = null;

export async function createDistritoView({ role, onNavigate, onLogout }: DistritoViewProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  const catalogos = await useCatalogos()
  const { colegios } = catalogos

  container.innerHTML = getDistritoTemplate(role)

  if (distritoUnsubscribe) {
    distritoUnsubscribe()
    distritoUnsubscribe = null
  }

  await bindDistritoView(container, { colegios }, role, onNavigate, onLogout)
  loadDistritoChart(container)

  const { subscribe, unsubscribe } = useRealtimeChannel('distrito-dashboard-rt', [
    {
      event: 'INSERT',
      schema: 'public',
      table: 'resultados_transmision',
      callback: () => {
        console.log('[Realtime] Nuevo resultado en DistritoView. Actualizando gráfica...');
        loadDistritoChart(container);
      }
    }
  ])
  
  subscribe()
  distritoUnsubscribe = unsubscribe

  return container
}

function getDistritoTemplate(role: string): string {
  const isPanelToAdmin = role === 'admin' ? `<button class="btn-link" id="btn-go-admin" style="color:#007bff;font-weight:bold;">🔐 Panel Admin</button>` : ''

  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Panel Interno</p>
          <h1>Centro de Carga</h1>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="mesas" type="button">Supervisión de Mesas</button>
          <button class="menu-link" data-view="veedores" type="button">Gestión de Veedores</button>
          <button class="menu-link" data-view="reportes" type="button">Reportes</button>
        </nav>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title">Gestión de Mesas</h2>
          
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            <button class="menu-tab is-active" data-view="mesas" type="button">Mesas</button>
            <button class="menu-tab" data-view="veedores" type="button">Delegados</button>
            <button class="menu-tab" data-view="reportes" type="button">Reportes</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            ${isPanelToAdmin}
            <button class="danger-btn" id="distrito-logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- MESAS -->
        <section id="view-mesas" class="view-root">
          <article class="card">
            <h3>Buscar Colegio</h3>
            <div class="search-input-wrapper">
              <input id="supervisor-colegio-search" type="search" placeholder="Escribe el nombre del colegio..." />
              <button type="button" id="supervisor-colegio-search-dropdown" class="search-dropdown-btn">▼</button>
            </div>
            <ul id="supervisor-colegio-results" class="search-list"></ul>
          </article>

          <div id="mesas-container" style="display: none;">
            <article class="card">
              <h3 id="selected-colegio-name">Colegio Seleccionado</h3>
              <div id="mesas-list" class="mesas-list"></div>
            </article>
          </div>
        </section>

        <!-- VEEDORES -->
        <section id="view-veedores" class="view-root" style="display: none;">
          <article class="card">
            <h3>Crear Delegado</h3>
            <div style="margin-top: 12px;">
              <label for="veedor-colegio-search">Colegio</label>
              <div class="search-input-wrapper">
                <input id="veedor-colegio-search" type="search" placeholder="Busca el nombre del colegio..." />
              </div>
              <ul id="veedor-colegio-results" class="search-list"></ul>
              
              <div id="veedor-form" style="display: none; margin-top: 16px;">
                <label for="veedor-usuario">Usuario</label>
                <input id="veedor-usuario" type="text" placeholder="Ej: jgarcia" />
                
                <label for="veedor-password">Contraseña</label>
                <input id="veedor-password" type="password" placeholder="Ingresa contraseña" />
                
                <button type="button" class="cta" id="btn-agregar-veedor" style="margin-top: 8px;">Crear Delegado</button>
              </div>
            </div>
          </article>

          <article class="card">
            <h3>Delegados Registrados</h3>
            <div id="veedores-list" class="veedores-list"></div>
          </article>
        </section>

        <!-- REPORTES -->
        <section id="view-reportes" class="view-root" style="display: none;">
          <article class="card">
            <h3>Reportes de Votos</h3>
            <div class="charts-container">
              <div class="chart-wrapper">
                <svg id="pie-chart" width="280" height="280" viewBox="0 0 280 280"></svg>
              </div>
              <div id="chart-legend" class="chart-legend"></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  `
}

async function bindDistritoView(
  container: HTMLElement,
  data: any,
  _role: string,
  onNavigate: (route: RouteId) => void,
  onLogout: () => void
) {
  const { colegios } = data

  // Navegación
  const viewMesas = container.querySelector<HTMLElement>('#view-mesas')
  const viewVeedores = container.querySelector<HTMLElement>('#view-veedores')
  const viewReportes = container.querySelector<HTMLElement>('#view-reportes')
  const viewTitle = container.querySelector<HTMLElement>('#view-title')
  const menuLinks = container.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = container.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    if (viewMesas) viewMesas.style.display = 'none'
    if (viewVeedores) viewVeedores.style.display = 'none'
    if (viewReportes) viewReportes.style.display = 'none'

    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    switch (viewName) {
      case 'mesas':
        if (viewMesas) viewMesas.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Gestión de Mesas'
        break
      case 'veedores':
        if (viewVeedores) viewVeedores.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Gestión de Veedores'
        break
      case 'reportes':
        if (viewReportes) viewReportes.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Reportes'
        break
    }

    menuLinks.forEach((btn) => {
      if (btn.dataset.view === viewName) btn.classList.add('is-active')
    })
    menuTabs.forEach((btn) => {
      if (btn.dataset.view === viewName) btn.classList.add('is-active')
    })
  }

  menuLinks.forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view || 'mesas'))
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view || 'mesas'))
  })

  // Logout
  const logoutBtn = container.querySelector<HTMLButtonElement>('#distrito-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout)
  }

  // Botón para ir a admin
  const btnGoAdmin = container.querySelector<HTMLButtonElement>('#btn-go-admin')
  if (btnGoAdmin) {
    btnGoAdmin.addEventListener('click', () => onNavigate('admin'))
  }

  // Búsqueda de colegios
  const supervisorSearch = container.querySelector<HTMLInputElement>('#supervisor-colegio-search')
  const supervisorResults = container.querySelector<HTMLUListElement>('#supervisor-colegio-results')
  const mesasContainer = container.querySelector<HTMLElement>('#mesas-container')
  const _mesasList = container.querySelector<HTMLElement>('#mesas-list')
  void _mesasList
  const selectedColegioName = container.querySelector<HTMLElement>('#selected-colegio-name')

  if (supervisorSearch && supervisorResults) {
    supervisorSearch.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value.trim().toLowerCase()
      if (!value) {
        supervisorResults.innerHTML = ''
        return
      }
      const items = colegios.filter((item: any) => item.nombre.toLowerCase().includes(value))
      supervisorResults.innerHTML = items.length
        ? items.map((item: any) => `<li data-colegio="${item.nombre}"><strong>${item.nombre}</strong><span>${item.distrito}</span></li>`).join('')
        : '<li class="empty">Sin coincidencias</li>'
    })

    supervisorResults.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        const colegioName = li.dataset.colegio
        if (selectedColegioName) selectedColegioName.textContent = colegioName || ''
        if (supervisorSearch) supervisorSearch.value = ''
        supervisorResults.innerHTML = ''
        if (mesasContainer) mesasContainer.style.display = 'block'
      }
    })
  }

  // Delegados
  const veedorSearch = container.querySelector<HTMLInputElement>('#veedor-colegio-search')
  const veedorResults = container.querySelector<HTMLUListElement>('#veedor-colegio-results')
  const veedorForm = container.querySelector<HTMLElement>('#veedor-form')

  let selectedVeedorColegio = ''

  if (veedorSearch && veedorResults) {
    veedorSearch.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value.trim().toLowerCase()
      if (!value) {
        veedorResults.innerHTML = ''
        return
      }
      const items = colegios.filter((item: any) => item.nombre.toLowerCase().includes(value))
      veedorResults.innerHTML = items.length
        ? items.map((item: any) => `<li data-colegio="${item.nombre}"><strong>${item.nombre}</strong></li>`).join('')
        : '<li class="empty">Sin resultados</li>'
    })

    veedorResults.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        selectedVeedorColegio = li.dataset.colegio || ''
        veedorSearch.value = ''
        veedorResults.innerHTML = ''
        if (veedorForm) veedorForm.style.display = 'block'
      }
    })
  }

  // Crear delegado
  const btnAgregarVeedor = container.querySelector<HTMLButtonElement>('#btn-agregar-veedor')
  const veedoresList = container.querySelector<HTMLElement>('#veedores-list')

  if (btnAgregarVeedor) {
    btnAgregarVeedor.addEventListener('click', async () => {
      const email = container.querySelector<HTMLInputElement>('#veedor-usuario')?.value || ''
      const password = container.querySelector<HTMLInputElement>('#veedor-password')?.value || ''

      if (!selectedVeedorColegio || !email || !password) {
        alert('Completa todos los campos')
        return
      }

      btnAgregarVeedor.disabled = true
      btnAgregarVeedor.textContent = 'Creando...'

      // TODO: Implementar via Edge Function
      alert('✅ Delegado creado (funcionalidad a implementar)')

      btnAgregarVeedor.disabled = false
      btnAgregarVeedor.textContent = 'Crear Delegado'
    })
  }

  // Cargar veedores
  if (veedoresList) {
    const { data: veedores } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .eq('rol', 'veedor')
      .eq('activo', true)
      .limit(10)

    if (veedores && veedores.length > 0) {
      veedoresList.innerHTML = veedores
        .map((v: any) => `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${v.nombre} ${v.apellido}</strong>
            <span>${v.email}</span>
          </div>
        </div>`)
        .join('')
    } else {
      veedoresList.innerHTML = '<p class="empty">No hay delegados registrados</p>'
    }
  }
}

export default createDistritoView

async function loadDistritoChart(container: HTMLElement) {
  const chartContainer = container.querySelector('#pie-chart')
  if (!chartContainer) return;

  const { data: monitorData } = await supabase
    .from('vista_monitoreo')
    .select('partido_id, partido, sigla, color_hex, total_votos')
    .order('total_votos', { ascending: false })

  if (monitorData && monitorData.length > 0) {
    const total = monitorData.reduce((acc: number, row: any) => acc + (row.total_votos || 0), 0)
    let angle = 0
    let svgPaths = ''

    monitorData.forEach((row: any) => {
      const votos = row.total_votos || 0
      const pct = total > 0 ? (votos / total) * 100 : 0
      const sliceAngle = (pct / 100) * 360

      const startRad = (angle * Math.PI) / 180
      const endRad = ((angle + sliceAngle) * Math.PI) / 180
      const x1 = 140 + 120 * Math.cos(startRad - Math.PI / 2)
      const y1 = 140 + 120 * Math.sin(startRad - Math.PI / 2)
      const x2 = 140 + 120 * Math.cos(endRad - Math.PI / 2)
      const y2 = 140 + 120 * Math.sin(endRad - Math.PI / 2)
      const largeArc = sliceAngle > 180 ? 1 : 0

      if (sliceAngle > 0) {
          if(sliceAngle >= 359.9) {
            svgPaths += `<circle cx="140" cy="140" r="120" fill="${row.color_hex || '#999'}" stroke="white" stroke-width="2"/>`
          } else {
            svgPaths += `<path d="M 140 140 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 120 120 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${row.color_hex || '#999'}" stroke="white" stroke-width="2"/>`
          }
      }
      angle += sliceAngle
    })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '280')
    svg.setAttribute('height', '280')
    svg.setAttribute('viewBox', '0 0 280 280')
    svg.innerHTML = svgPaths

    chartContainer.parentElement!.replaceChild(svg, chartContainer)
    svg.id = 'pie-chart'
  }
}

