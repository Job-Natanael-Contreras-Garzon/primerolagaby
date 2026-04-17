/**
 * LectorView: Vista de monitoreo general de resultados
 * Responsabilidades:
 * - Mostrar resumen nacional de resultados
 * - Desglose por distrito y colegio
 * - Gráficos de votos por partido
 *
 * Máx 300 líneas
 */

import { supabase } from '../../../utils/supabase'
import { useCatalogos } from '../shared/hooks'
import { type RouteId } from '../shared/types'

interface LectorViewProps {
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

export async function createLectorView({ onNavigate: _onNavigate, onLogout }: LectorViewProps): Promise<HTMLElement> {
  void _onNavigate
  const container = document.createElement('div')

  // Cargar catálogos
  const catalogos = await useCatalogos()

  container.innerHTML = getLectorTemplate()

  // Bind interacción
  await bindLectorView(container, catalogos, onLogout)

  return container
}

function getLectorTemplate(): string {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Panel de Monitoreo</p>
          <h1>Lector Electoral</h1>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="resumen" type="button">📊 Resumen General</button>
          <button class="menu-link" data-view="distritos" type="button">🗺️ Por Distrito</button>
          <button class="menu-link" data-view="colegios" type="button">🏫 Por Colegio</button>
          <button class="menu-link" data-view="graficos" type="button">📈 Gráficos</button>
        </nav>

        <div class="status-box">
          <p>Estado General</p>
          <strong id="lector-status">Cargando...</strong>
          <span id="lector-mesas">-- mesas procesadas</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="lector-title">Resumen General</h2>
          
          <nav class="menu-horizontal" aria-label="Vistas">
            <button class="menu-tab is-active" data-view="resumen" type="button">Resumen</button>
            <button class="menu-tab" data-view="distritos" type="button">Distritos</button>
            <button class="menu-tab" data-view="colegios" type="button">Colegios</button>
          </nav>

          <div class="top-actions">
            <button class="danger-btn" id="lector-logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- RESUMEN GENERAL -->
        <div id="vista-resumen" class="content-view is-active">
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Total de Mesas</span>
              <strong class="stat-value" id="total-mesas">0</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Mesas Transmitidas</span>
              <strong class="stat-value" id="mesas-transmitidas">0</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Porcentaje</span>
              <strong class="stat-value" id="porcentaje-transmitidas">0%</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Distritos Procesados</span>
              <strong class="stat-value" id="distritos-procesados">0</strong>
            </div>
          </div>

          <div class="section">
            <h3>Resumen por Partido (Nacional)</h3>
            <div id="resumen-partidos" class="parties-grid"></div>
          </div>

          <div id="grafico-resumen" style="min-height: 300px;"></div>
        </div>

        <!-- DISTRITOS -->
        <div id="vista-distritos" class="content-view" style="display:none;">
          <div class="selector-group">
            <label for="select-distrito">Seleccionar Distrito:</label>
            <select id="select-distrito">
              <option value="">-- Cargando distritos --</option>
            </select>
          </div>
          <div id="detalle-distrito" style="display: none;"></div>
        </div>

        <!-- COLEGIOS -->
        <div id="vista-colegios" class="content-view" style="display:none;">
          <div class="selector-group">
            <label for="select-colegio">Seleccionar Colegio:</label>
            <select id="select-colegio">
              <option value="">-- Selecciona un colegio --</option>
            </select>
          </div>
          <div id="detalle-colegio" style="display: none;"></div>
        </div>

        <!-- GRÁFICOS -->
        <div id="vista-graficos" class="content-view" style="display:none;">
          <h3>Gráficos Nacionales</h3>
          <div id="grafico-nacional" style="min-height: 400px;"></div>
          <h3 style="margin-top: 40px;">Progreso de Transmisión</h3>
          <div id="grafico-progreso" style="min-height: 300px;"></div>
        </div>
      </main>
    </div>

    <style>
      .selector-group {
        margin: 15px 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .selector-group select {
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      .content-view {
        display: none;
      }
      .content-view.is-active {
        display: block;
      }
      .parties-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
        margin: 15px 0;
      }
      .party-card {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 15px;
        text-align: center;
      }
    </style>
  `
}

async function bindLectorView(
  container: HTMLElement,
  _catalogos: any,
  onLogout: () => void
) {
  // Navegación de vistas
  const viewResumen = container.querySelector<HTMLElement>('#vista-resumen')
  const viewDistritos = container.querySelector<HTMLElement>('#vista-distritos')
  const viewColegios = container.querySelector<HTMLElement>('#vista-colegios')
  const viewGraficos = container.querySelector<HTMLElement>('#vista-graficos')
  const lectorTitle = container.querySelector<HTMLElement>('#lector-title')
  const menuLinks = container.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = container.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    if (viewResumen) viewResumen.style.display = 'none'
    if (viewDistritos) viewDistritos.style.display = 'none'
    if (viewColegios) viewColegios.style.display = 'none'
    if (viewGraficos) viewGraficos.style.display = 'none'

    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    switch (viewName) {
      case 'resumen':
        if (viewResumen) viewResumen.style.display = 'block'
        if (lectorTitle) lectorTitle.textContent = 'Resumen General'
        break
      case 'distritos':
        if (viewDistritos) viewDistritos.style.display = 'block'
        if (lectorTitle) lectorTitle.textContent = 'Por Distrito'
        break
      case 'colegios':
        if (viewColegios) viewColegios.style.display = 'block'
        if (lectorTitle) lectorTitle.textContent = 'Por Colegio'
        break
      case 'graficos':
        if (viewGraficos) viewGraficos.style.display = 'block'
        if (lectorTitle) lectorTitle.textContent = 'Gráficos'
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
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || 'resumen'
      showView(view)
    })
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || 'resumen'
      showView(view)
    })
  })

  // Logout
  const logoutBtn = container.querySelector<HTMLButtonElement>('#lector-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout)
  }

  // Cargar data inicial
  const totalMesasSpan = container.querySelector<HTMLElement>('#total-mesas')
  const mesasTransmitidas = container.querySelector<HTMLElement>('#mesas-transmitidas')
  const porcentaje = container.querySelector<HTMLElement>('#porcentaje-transmitidas')

  if (totalMesasSpan) {
    const { data: mesas } = await supabase.from('mesas').select('id').eq('activo', true)
    const total = mesas?.length || 0
    totalMesasSpan.textContent = total.toString()

    const { data: transmisiones } = await supabase.from('transmisiones').select('id')
    const transmitidas = transmisiones?.length || 0
    if (mesasTransmitidas) mesasTransmitidas.textContent = transmitidas.toString()
    if (porcentaje) porcentaje.textContent = total > 0 ? `${Math.round((transmitidas / total) * 100)}%` : '0%'
  }
}

export default createLectorView
