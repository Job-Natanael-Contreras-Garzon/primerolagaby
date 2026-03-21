import './style.css'
import { supabase } from './utils/supabase'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor #app')
}

const rootApp = app

type RouteId = 'home' | 'login' | 'panel'
type RoleId = 'veedor' | 'supervisor2' | 'supervisor1' | 'admin'

// ─── DATOS DINÁMICOS DESDE SUPABASE ────────────────────────────────────────
// Estos arrays se llenan con loadCatalogos() al iniciar la app
let colegiosMock: { nombre: string; distrito: string; recinto_id?: number }[] = []
let partidos: { id: number; nombre: string; sigla: string; color: string }[] = []
let cargos: { id: number; nombre: string }[] = [
  { id: 1, nombre: 'Alcalde' },
  { id: 2, nombre: 'Concejal' },
]
let candidatos: { id: number; nombre: string; partido_id: number; cargo_id: number }[] = []
let mesas: { id: number; numero: string; colegio: string; distrito: string; estado: string }[] = []

const DEFAULT_LOGIN_DOMAIN = '1rolagaby.bo'

function normalizeLoginEmail(raw: string): string {
  const value = raw.trim().toLowerCase()
  if (!value) return ''
  if (value.includes('@')) return value
  return `${value}@${DEFAULT_LOGIN_DOMAIN}`
}

function clearAuthContext() {
  window.localStorage.removeItem('authRole')
  window.localStorage.removeItem('authDistrictName')
}

async function syncAuthContextFromSession() {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session?.user?.id) {
    clearAuthContext()
    return null
  }

  const { data, error } = await supabase.functions.invoke('get-my-profile', {
    body: {},
  })

  const profile = data?.profile
  if (error || data?.error || !profile?.rol || profile.activo === false) {
    clearAuthContext()
    return null
  }

  const districtName = profile.districtName ?? ''

  window.localStorage.setItem('authRole', profile.rol)
  if (districtName) {
    window.localStorage.setItem('authDistrictName', districtName)
  } else {
    window.localStorage.removeItem('authDistrictName')
  }

  return profile
}

async function logAuthAttempt(payload: {
  email: string
  status: 'success' | 'failed'
  reason?: string
  userId?: number | null
}) {
  try {
    await supabase.functions.invoke('log-auth-attempt', {
      body: payload,
    })
  } catch {
    // No bloquear login si falla bitácora
  }
}

// Carga distritos y recintos (colegios) desde Supabase
async function loadCatalogos() {
  try {
    // Cargar recintos con su distrito
    const { data: recintos, error: rErr } = await supabase
      .from('recintos')
      .select('id, nombre, distritos(nombre)')
      .eq('activo', true)

    if (rErr) throw rErr

    if (recintos) {
      colegiosMock = recintos.map((r: any) => ({
        nombre: r.nombre,
        distrito: r.distritos?.nombre ?? 'Sin distrito',
        recinto_id: r.id,
      }))
    }

    // Cargar partidos
    const { data: partData, error: pErr } = await supabase
      .from('partidos')
      .select('id, nombre, sigla, color_hex')
      .eq('activo', true)

    if (pErr) throw pErr

    if (partData) {
      partidos = partData.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        sigla: p.sigla,
        color: p.color_hex ?? '#888888',
      }))
    }

    // Cargar mesas activas
    const { data: mesasData, error: mErr } = await supabase
      .from('mesas')
      .select('id, numero_mesa, estado, recintos(nombre, distritos(nombre))')
      .eq('activo', true)

    if (mErr) throw mErr

    if (mesasData) {
      mesas = mesasData.map((m: any) => ({
        id: m.id,
        numero: m.numero_mesa,
        colegio: m.recintos?.nombre ?? 'Sin recinto',
        distrito: m.recintos?.distritos?.nombre ?? 'Sin distrito',
        estado: m.estado,
      }))
    }

    // Generar candidatos como combinación de partidos × cargos
    // (en producción, tendrás una tabla real de candidatos)
    candidatos = []
    let cid = 1
    partidos.forEach((p) => {
      cargos.forEach((c) => {
        candidatos.push({ id: cid++, nombre: `Candidato ${p.sigla}`, partido_id: p.id, cargo_id: c.id })
      })
    })
  } catch (err) {
    console.error('[Supabase] Error cargando catálogos:', err)
    // Si falla, dejar arrays vacíos — la UI mostrará estado vacío
  }
}

// Initialize sample data for demo


function getRoute(): RouteId {
  const path = window.location.pathname
  if (path === '/login') return 'login'
  if (path === '/panel') return 'panel'
  return 'home'
}

function navigate(path: '/login' | '/' | '/panel') {
  window.history.pushState({}, '', path)
  renderRoute()
}

async function isLoggedIn(): Promise<boolean> {
  const profile = await syncAuthContextFromSession()
  return Boolean(profile)
}

function getRoleLabel() {
  const role = window.localStorage.getItem('authRole') as RoleId | null
  if (role === 'admin') return 'Administrador'
  if (role === 'supervisor2') return 'Supervisor de Distrito'
  if (role === 'supervisor1') return 'Responsable de Colegio'
  if (role === 'veedor') return 'Veedor'
  return 'Invitado'
}

function getSupervisorDistrict(): string {
  return window.localStorage.getItem('authDistrictName') || ''
}

function homeTemplate() {
  return `
    <section class="public-shell">
      <header class="public-header">
        <div>
          <p class="badge">Portal Publico</p>
          <h1>Transmision de Resultados</h1>
          <p class="lead">Reporta los resultados electorales de tu mesa.</p>
        </div>
        <button type="button" class="btn-link-header" id="btn-logout-public" style="color: #d90000;">Cerrar sesión</button>
      </header>

      <article class="card large-form">
        <!-- PESTAÑAS (solo para Veedor) -->
        <div class="veedor-tabs" id="veedor-tabs-container">
          <nav class="tabs-nav">
            <button type="button" class="tab-btn is-active" data-tab="reportar">SUBIR DATOS</button>
            <button type="button" class="tab-btn" data-tab="mesas">Mesas Subidas</button>
          </nav>
        </div>

        <!-- SECCIÓN REPORTAR -->
        <div id="tab-reportar" class="tab-content is-active">
          <form class="manual-grid" id="manual-form">
          
          <!-- SECCIÓN 1: SELECCIONAR COLEGIO (se oculta después) -->
          <fieldset id="selection-fieldset">
            <legend>Paso 1: ¿Dónde votaste?</legend>
            <p class="section-hint">Busca tu colegio o rellénalos datos manualmente</p>

            <div class="selection-toggle">
              <button type="button" class="selection-btn" data-selection="search">🔍 Buscar por nombre de colegio</button>
              <button type="button" class="selection-btn is-active" data-selection="manual">🔍 Buscar por distrito </button>
            </div>

            <div id="selection-search" class="selection-panel">
              <div class="search-input-wrapper">
                <input id="colegio-search" type="search" placeholder="Escribe el nombre de tu colegio..." />
                <button type="button" id="colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos los colegios">▼</button>
              </div>
              <ul id="colegio-results" class="search-list"></ul>
            </div>

            <div id="selection-manual" class="selection-panel is-active">
              <div class="form-row-2">
                <div>
                  <label for="public-distrito">Distrito</label>
                  <select id="public-distrito">
                    <option value="">Selecciona distrito</option>
                  </select>
                </div>
                <div>
                  <label for="public-colegio">Colegio</label>
                  <select id="public-colegio">
                    <option value="">Primero selecciona un distrito</option>
                  </select>
                </div>
              </div>
              <button type="button" class="cta-secondary" id="btn-manual-confirm">Confirmar y continuar</button>
            </div>
          </fieldset>

          <!-- SECCIÓN 2: REGISTRAR DATOS (visible después de seleccionar colegio) -->
          <fieldset id="data-fieldset" style="display: none;">
            <div class="location-bar">
              <p id="selected-location">Seleccionado: <strong></strong></p>
              <button type="button" class="btn-link" id="btn-change-location">Cambiar</button>
            </div>

            <legend>Paso 2: Registra los resultados</legend>

            <div>
              <label for="public-mesa">Mesa</label>
              <input id="public-mesa" type="text" placeholder="Ej: Mesa 0123" required />
            </div>

            <div>
              <label for="public-foto">Foto del acta</label>
              <input id="public-foto" type="file" accept="image/*" required />
            </div>

            <div>
              <label>Cargo a reportar</label>
              <div class="cargo-tabs" id="cargo-tabs">
                ${cargos.map((c, idx) => `<button class="cargo-tab ${idx === 0 ? 'is-active' : ''}" type="button" data-cargo="${c.id}">${c.nombre}</button>`).join('')}
              </div>
            </div>

            <div id="candidatos-grid" class="candidatos-grid"></div>

            <button class="cta-large" type="submit">Guardar en borrador local</button>
          </fieldset>

          <!-- SECCIÓN 3: ÉXITO (visible después de submit) -->
          <fieldset id="success-fieldset" style="display: none;">
            <div class="success-message">
              <div class="success-icon">✓</div>
              <h2>¡Archivo subido exitosamente!</h2>
              <p>Los datos de tu mesa han sido registrados correctamente.</p>
            </div>

            <div class="success-actions">
              <button type="button" class="cta-large" id="btn-upload-another">Subir otra mesa</button>
              <button type="button" class="cta-secondary" id="btn-finish">Finalizar</button>
            </div>
          </fieldset>

          </form>
        </div>

        <!-- SECCIÓN MESAS SUBIDAS (PESTAÑA) -->
        <div id="tab-mesas" class="tab-content" style="display: none;">
          <article class="card-inner">
            <h3>Mesas Subidas</h3>
            <p>Historial de mesas que has reportado</p>
            <div id="mesas-subidas-tab-list" class="mesas-list" style="margin-top: 16px;"></div>
          </article>
        </div>
      </article>
    </section>
  `
}

function loginTemplate() {
  return `
    <section class="login-shell">
      <article class="login-card">
        <h1>Login de Acceso</h1>
        <p>Ingresa con tu rol de usuario.</p>

        <form id="login-form" class="form-grid">
          <p id="login-error" style="display:none; background:#ffe9e9; color:#a40000; border:1px solid #f1b0b0; padding:10px; border-radius:8px; font-size:14px;"></p>

          <label for="user">Usuario</label>
          <input id="user" type="email" placeholder="correo@dominio.com" required />

          <label for="pass">Clave</label>
          <input id="pass" type="password" placeholder="clave" required />

          <button class="cta" type="submit">Entrar</button>
          <button class="ghost-btn" data-go="/" type="button">Volver al inicio</button>
        </form>
      </article>
    </section>
  `
}

function colegioTemplate() {
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

        <div class="status-box">
          <p>Mi Colegio</p>
          <strong>Colegio Central</strong>
          <span>Distrito 01</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title-colegio">Mesas del Colegio</h2>
          
          <!-- MENU MOBILE/RESPONSIVE -->
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            <button class="menu-tab is-active" data-view="mesas-colegio" type="button">Mesas</button>
            <button class="menu-tab" data-view="crear-delegados" type="button">Delegados</button>
            <button class="menu-tab" data-view="solicitudes" type="button">Solicitudes</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- VIEW: MESAS COLEGIO -->
        <section id="view-mesas-colegio" class="view-root">
          <article class="card">
            <h3>Mesas del Colegio Central</h3>
            <p>Estado de las mesas registradas en este colegio</p>
            <div id="mesas-colegio-list" class="mesas-list"></div>
          </article>
        </section>

        <!-- VIEW: CREAR DELEGADOS -->
        <section id="view-crear-delegados" class="view-root" style="display: none;">
          <article class="card">
            <h3>Crear Delegado</h3>
            <p>Crea nuevas credenciales para delegados (veedores)</p>
            
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

        <!-- VIEW: SOLICITUDES -->
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

function panelTemplate() {
  const role = window.localStorage.getItem('authRole')
  const isAdmin = role === 'admin'
  const reportScope = isAdmin ? 'Municipio' : getSupervisorDistrict()
  
  // Si es colegio, usar colegioTemplate
  if (role === 'supervisor1') {
    return colegioTemplate()
  }

  // Para supervisor2 y admin
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">${isAdmin ? 'Administrador General' : 'Panel Interno'}</p>
          <h1>${isAdmin ? 'Centro de Control' : 'Centro de Carga'}</h1>
          <small>Sesion activa: ${getRoleLabel()}</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          ${isAdmin ? '<button class="menu-link is-active" data-view="admin" type="button">Dashboard General</button>' : ''}
          <button class="menu-link ${isAdmin ? '' : 'is-active'}" data-view="mesas" type="button">Supervisión de Mesas</button>
          <button class="menu-link" data-view="veedores" type="button">${isAdmin ? 'Gestión de Usuarios' : 'Gestión de Veedores'}</button>
          <button class="menu-link" data-view="reportes" type="button">Reportes</button>
        </nav>

        <div class="status-box">
          <p>${isAdmin ? 'Cobertura' : 'Tu Distrito'}</p>
          <strong>${isAdmin ? 'Municipio' : getSupervisorDistrict()}</strong>
          <span>${isAdmin ? 'Control total del sistema' : 'Mesas bajo tu supervisión'}</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title">${isAdmin ? 'Dashboard General' : 'Gestión de Mesas'}</h2>
          
          <!-- MENU MOBILE/RESPONSIVE -->
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            ${isAdmin ? '<button class="menu-tab is-active" data-view="admin" type="button">Dashboard</button>' : ''}
            <button class="menu-tab ${isAdmin ? '' : 'is-active'}" data-view="mesas" type="button">Mesas</button>
            <button class="menu-tab" data-view="veedores" type="button">${isAdmin ? 'Usuarios' : 'Delegados'}</button>
            <button class="menu-tab" data-view="reportes" type="button">Reportes</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        ${isAdmin ? `
        <section id="view-admin" class="view-root">
          <article class="card">
            <h3>Resumen Ejecutivo</h3>
            <p>Estado general del sistema en tiempo real</p>
            <div id="admin-kpis" class="charts-container"></div>
          </article>
          <article class="card">
            <h3>Bitácora reciente</h3>
            <div id="admin-bitacora-list" class="mesas-list"></div>
          </article>
          <article class="card">
            <h3>Gestión Maestra</h3>
            <p>CRUD básico de Distritos, Recintos y Mesas</p>

            <div class="charts-container" style="gap: 16px;">
              <div style="flex:1; min-width:260px;">
                <h4 style="margin:0 0 8px 0;">Nuevo Distrito</h4>
                <label for="admin-municipio-select">Municipio</label>
                <select id="admin-municipio-select"></select>
                <label for="admin-distrito-numero">Número de distrito</label>
                <input id="admin-distrito-numero" type="number" min="1" placeholder="Ej: 16" />
                <button type="button" class="cta" id="btn-admin-create-distrito" style="margin-top:8px;">Crear Distrito</button>
                <div id="admin-distritos-list" class="mesas-list" style="margin-top:12px;"></div>
              </div>

              <div style="flex:1; min-width:260px;">
                <h4 style="margin:0 0 8px 0;">Nuevo Recinto</h4>
                <label for="admin-recinto-distrito-select">Distrito</label>
                <select id="admin-recinto-distrito-select"></select>
                <label for="admin-recinto-nombre">Nombre del recinto</label>
                <input id="admin-recinto-nombre" type="text" placeholder="Ej: U.E. Nuevo Amanecer" />
                <label for="admin-recinto-direccion">Dirección</label>
                <input id="admin-recinto-direccion" type="text" placeholder="Opcional" />
                <button type="button" class="cta" id="btn-admin-create-recinto" style="margin-top:8px;">Crear Recinto</button>
                <div id="admin-recintos-list" class="mesas-list" style="margin-top:12px;"></div>
              </div>

              <div style="flex:1; min-width:260px;">
                <h4 style="margin:0 0 8px 0;">Nueva Mesa</h4>
                <label for="admin-mesa-recinto-select">Recinto</label>
                <select id="admin-mesa-recinto-select"></select>
                <label for="admin-mesa-numero">Número de mesa</label>
                <input id="admin-mesa-numero" type="text" placeholder="Ej: M-001" />
                <label for="admin-mesa-habilitados">Total habilitados</label>
                <input id="admin-mesa-habilitados" type="number" min="0" value="0" />
                <button type="button" class="cta" id="btn-admin-create-mesa" style="margin-top:8px;">Crear Mesa</button>
                <div id="admin-mesas-list" class="mesas-list" style="margin-top:12px;"></div>
              </div>
            </div>
          </article>
        </section>
        ` : ''}

        <!-- VIEW: MESAS -->
        <section id="view-mesas" class="view-root" style="display: ${isAdmin ? 'none' : 'block'};">
          <article class="card">
            <h3>Buscar Colegio</h3>
            <p>Selecciona un colegio para ver sus mesas</p>
            <div class="search-input-wrapper">
              <input id="supervisor-colegio-search" type="search" placeholder="Escribe el nombre del colegio..." />
              <button type="button" id="supervisor-colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos los colegios">▼</button>
            </div>
            <ul id="supervisor-colegio-results" class="search-list"></ul>
          </article>

          <div id="mesas-container" style="display: none;">
            <article class="card">
              <h3 id="selected-colegio-name">Colegio Seleccionado</h3>
              <button type="button" class="btn-link-smaller" id="btn-change-colegio">Buscar otro</button>
              <div id="mesas-list" class="mesas-list"></div>
            </article>
          </div>
        </section>

        <!-- VIEW: VEEDORES -->
        <section id="view-veedores" class="view-root" style="display: none;">
          <article class="card">
            <h3>Crear Delegado</h3>
            <p>Busca un colegio y crea credenciales para un delegado</p>
            
            <div style="margin-top: 12px;">
              <label for="veedor-colegio-search">Colegio</label>
              <div class="search-input-wrapper">
                <input id="veedor-colegio-search" type="search" placeholder="Busca el nombre del colegio..." />
                <button type="button" id="veedor-colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos los colegios">▼</button>
              </div>
              <ul id="veedor-colegio-results" class="search-list"></ul>
              
              <div id="veedor-form" style="display: none; margin-top: 16px;">
                <p style="color: #6b3f67; font-size: 14px; margin-bottom: 12px;"><strong>Colegio seleccionado:</strong> <span id="veedor-colegio-selected"></span></p>
                
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

        <!-- VIEW: REPORTES -->
        <section id="view-reportes" class="view-root" style="display: none;">
          <article class="card">
            <h3>Reportes de Votos - ${reportScope}</h3>
            <p>Distribución de votos por partido en tu distrito</p>

            <div id="special-votes-summary" class="charts-container" style="margin-bottom: 12px;"></div>
            
            <div class="charts-container">
              <!-- Pie Chart -->
              <div class="chart-wrapper">
                <svg id="pie-chart" width="280" height="280" viewBox="0 0 280 280"></svg>
              </div>
              
              <!-- Legend -->
              <div id="chart-legend" class="chart-legend"></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  `
}

function bindPublicHome() {
  const selectionFieldset = document.querySelector<HTMLElement>('#selection-fieldset')
  const dataFieldset = document.querySelector<HTMLElement>('#data-fieldset')
  const selectedLocationSpan = document.querySelector<HTMLElement>('#selected-location strong')

  // Helper: Hide selection, show data
  const showDataSection = (locationText: string) => {
    if (selectionFieldset) selectionFieldset.style.display = 'none'
    if (dataFieldset) dataFieldset.style.display = 'block'
    if (selectedLocationSpan) selectedLocationSpan.textContent = locationText
    // Scroll to data section
    dataFieldset?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper: Show selection, hide data
  const showSelectionSection = () => {
    if (selectionFieldset) selectionFieldset.style.display = 'block'
    if (dataFieldset) dataFieldset.style.display = 'none'
    selectionFieldset?.scrollIntoView({ behavior: 'smooth' })
  }

  // Change location button
  const btnChangeLocation = document.querySelector<HTMLButtonElement>('#btn-change-location')
  if (btnChangeLocation) {
    btnChangeLocation.addEventListener('click', (e) => {
      e.preventDefault()
      showSelectionSection()
    })
  }

  // Selection toggle (search vs manual fill)
  const selectionBtns = document.querySelectorAll<HTMLButtonElement>('.selection-btn')
  const selectionSearch = document.querySelector<HTMLElement>('#selection-search')
  const selectionManual = document.querySelector<HTMLElement>('#selection-manual')

  selectionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selection = btn.dataset.selection
      selectionBtns.forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')

      if (selection === 'search') {
        selectionSearch?.classList.add('is-active')
        selectionManual?.classList.remove('is-active')
      } else {
        selectionManual?.classList.add('is-active')
        selectionSearch?.classList.remove('is-active')
      }
    })
  })

  // Manual selects: Districts and Colleges
  const distritoSelect = document.querySelector<HTMLSelectElement>('#public-distrito')
  const colegioSelect = document.querySelector<HTMLSelectElement>('#public-colegio')

  // Populate districts dropdown
  if (distritoSelect) {
    const distritos = [...new Set(colegiosMock.map((c) => c.distrito))].sort()
    distritos.forEach((d) => {
      const option = document.createElement('option')
      option.value = d
      option.textContent = d
      distritoSelect.appendChild(option)
    })

    // When district changes, populate colleges
    distritoSelect.addEventListener('change', () => {
      if (colegioSelect) {
        const selectedDistrito = distritoSelect.value
        colegioSelect.innerHTML = '<option value="">Selecciona colegio</option>'

        if (selectedDistrito) {
          const colegios = colegiosMock
            .filter((c) => c.distrito === selectedDistrito)
            .map((c) => c.nombre)
            .sort()

          colegios.forEach((colegio) => {
            const option = document.createElement('option')
            option.value = colegio
            option.textContent = colegio
            colegioSelect.appendChild(option)
          })
        }
      }
    })
  }

  // Search functionality (find college by name)
  const input = document.querySelector<HTMLInputElement>('#colegio-search')
  const results = document.querySelector<HTMLUListElement>('#colegio-results')
  if (input && results) {
    const paint = (term: string) => {
      const value = term.trim().toLowerCase()
      if (!value) {
        results.innerHTML = ''
        return
      }
      const items = colegiosMock.filter((item) => item.nombre.toLowerCase().includes(value))
      results.innerHTML = items.length
        ? items.map((item) => `<li data-colegio="${item.nombre}" data-distrito="${item.distrito}"><strong>${item.nombre}</strong><span>${item.distrito}</span></li>`).join('')
        : '<li class="empty">Sin coincidencias</li>'
    }

    input.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement
      paint(target.value)
    })

    // Click on search result fills the fields and advances
    results.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        const colegio = li.dataset.colegio
        const distrito = li.dataset.distrito
        
        // Update select dropdowns too if they exist
        if (distritoSelect) distritoSelect.value = distrito || ''
        if (colegioSelect) {
          // Trigger change event to populate colegios
          distritoSelect?.dispatchEvent(new Event('change'))
          // Set colegio value after a short delay to let change event populate
          setTimeout(() => {
            if (colegioSelect && colegio) colegioSelect.value = colegio
          }, 10)
        }
        
        // Show data section with selected location
        showDataSection(`${distrito} - ${colegio}`)
      }
    })

    results.innerHTML = ''
  }

  // Dropdown para mostrar todos los colegios ordenados alfabéticamente
  const btnColegioDropdown = document.querySelector<HTMLButtonElement>('#colegio-search-dropdown')
  if (btnColegioDropdown && results) {
    btnColegioDropdown.addEventListener('click', () => {
      // Toggle: si hay resultados, cerrar; si no, abrir
      if (results.innerHTML !== '') {
        results.innerHTML = ''
      } else {
        const allColegios = [...colegiosMock].sort((a, b) => a.nombre.localeCompare(b.nombre))
        results.innerHTML = allColegios
          .map((item) => `<li data-colegio="${item.nombre}" data-distrito="${item.distrito}"><strong>${item.nombre}</strong><span>${item.distrito}</span></li>`)
          .join('')
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  // Close dropdown when clicking outside or pressing Escape
  if (results && input) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!input?.contains(target) && !btnColegioDropdown?.contains(target) && results.innerHTML !== '') {
        results.innerHTML = ''
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && results.innerHTML !== '') {
        results.innerHTML = ''
      }
    })
  }

  // Manual confirm button
  const btnManualConfirm = document.querySelector<HTMLButtonElement>('#btn-manual-confirm')
  if (btnManualConfirm) {
    btnManualConfirm.addEventListener('click', (e) => {
      e.preventDefault()
      const colegio = colegioSelect?.value || ''
      const distrito = distritoSelect?.value || ''

      if (colegio && distrito) {
        showDataSection(`${distrito} - ${colegio}`)
      } else {
        alert('Por favor, selecciona un distrito y un colegio')
      }
    })
  }

  // Cargo tabs and candidate voting
  const cargoTabs = document.querySelectorAll<HTMLButtonElement>('.cargo-tab')
  const candidatosGrid = document.querySelector<HTMLElement>('#candidatos-grid')

  const renderCandidatos = (cargoId: number) => {
    if (!candidatosGrid) return
    const filtered = candidatos.filter((c) => c.cargo_id === cargoId)

    if (!filtered.length) {
      candidatosGrid.innerHTML = '<p class="empty">No hay candidatos para este cargo</p>'
      return
    }

    const candidatosHtml = filtered
      .map((c) => {
        const partido = partidos.find((p) => p.id === c.partido_id)
        return `<label class="candidato-item">
          <input type="number" min="0" value="0" data-candidato="${c.id}" />
          <span>${c.nombre}</span>
          <span class="partido-badge" style="background-color: ${partido?.color || '#ccc'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">${partido?.sigla}</span>
        </label>`
      })
      .join('')

    candidatosGrid.innerHTML = `<div class="candidatos-list">${candidatosHtml}</div>`
  }

  cargoTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      cargoTabs.forEach((t) => t.classList.remove('is-active'))
      tab.classList.add('is-active')
      const cargoId = parseInt(tab.dataset.cargo as string)
      renderCandidatos(cargoId)
    })
  })

  // Initial render for first cargo (but only when data section is visible)
  if (cargoTabs.length > 0) {
    const firstTab = cargoTabs[0]
    const cargoId = parseInt(firstTab.dataset.cargo as string)
    renderCandidatos(cargoId)
  }

  // Form submission
  const form = document.querySelector<HTMLFormElement>('#manual-form')
  const successFieldset = document.querySelector<HTMLElement>('#success-fieldset')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      // Guardar mesa subida
      const mesaNumero = document.querySelector<HTMLInputElement>('#public-mesa')?.value || 'Sin número'
      const colegioValue = selectedLocationSpan?.textContent || ''

      // Buscar la mesa en los datos cargados de Supabase
      const mesaEncontrada = mesas.find(
        (m) => m.numero.trim() === mesaNumero.trim() &&
               colegioValue.includes(m.colegio)
      )

      // Recolectar votos de candidatos por cargo activo
      const cargoActivoTab = document.querySelector<HTMLButtonElement>('.cargo-tab.is-active')
      const cargoActivoId = cargoActivoTab ? parseInt(cargoActivoTab.dataset.cargo as string) : 1
      const inputs = document.querySelectorAll<HTMLInputElement>('#candidatos-grid input[data-candidato]')
      const votos: { partido_id: number; votos: number; tipo_cargo: string }[] = []
      inputs.forEach((inp) => {
        const candidatoId = parseInt(inp.dataset.candidato as string)
        const candidato = candidatos.find((c) => c.id === candidatoId)
        if (candidato) {
          const cargo = cargos.find((c) => c.id === cargoActivoId)
          const tipoCargo = cargo?.nombre.toLowerCase() === 'concejal' ? 'concejal' : 'alcalde'
          votos.push({ partido_id: candidato.partido_id, votos: parseInt(inp.value) || 0, tipo_cargo: tipoCargo })
        }
      })

      // Obtener sesión actual (si el usuario está logueado)
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id

      let usuarioTablaId: number | null = null
      if (userId) {
        const { data: perfil, error: perfilErr } = await supabase
          .from('usuarios')
          .select('id, rol')
          .eq('auth_id', userId)
          .single()

        if (perfilErr || !perfil?.id) {
          alert('No se encontró tu perfil de usuario. Inicia sesión nuevamente.')
          return
        }

        if (perfil.rol !== 'veedor') {
          alert('Solo usuarios con rol veedor pueden transmitir mesas.')
          return
        }

        usuarioTablaId = perfil.id
      }

      if (mesaEncontrada && userId && usuarioTablaId) {
        if (mesaEncontrada.estado === 'transmitida') {
          alert('Esta mesa ya fue transmitida y no puede volver a cargarse.')
          return
        }

        // Insertar transmisión real en Supabase
        const { data: trans, error: transErr } = await supabase
          .from('transmisiones')
          .insert({
            mesa_id: mesaEncontrada.id,
            usuario_id: usuarioTablaId,
            imagen_acta_url: null,
            es_valida: true,
          })
          .select('id')
          .single()

        if (transErr) {
          console.error('[Supabase] Error insertando transmisión:', transErr)
          alert('Error al guardar en el servidor. Reintenta.')
          return
        }

        if (trans && votos.length > 0) {
          const resultados = votos.map((v) => ({
            transmision_id: trans.id,
            partido_id: v.partido_id,
            votos_obtenidos: v.votos,
            tipo_cargo: v.tipo_cargo,
          }))

          const { error: resErr } = await supabase
            .from('resultados_transmision')
            .insert(resultados)

          if (resErr) console.error('[Supabase] Error insertando resultados:', resErr)
        }

        mesas = mesas.map((m) => (m.id === mesaEncontrada.id ? { ...m, estado: 'transmitida' } : m))
        console.log('[Supabase] Transmisión guardada correctamente')
      } else {
        alert('No se pudo validar la mesa o la sesión para transmitir.')
        return
      }

      // Guardar última ubicación reportada
      if (colegioValue) {
        const [distrito, colegio] = colegioValue.split(' - ')
        localStorage.setItem('lastReportedLocation', JSON.stringify({ distrito, colegio }))
      }

      // Hide data section, show success section
      if (dataFieldset) dataFieldset.style.display = 'none'
      if (successFieldset) successFieldset.style.display = 'block'

      // Scroll to success message
      successFieldset?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  // Success actions
  const btnUploadAnother = document.querySelector<HTMLButtonElement>('#btn-upload-another')
  const btnFinish = document.querySelector<HTMLButtonElement>('#btn-finish')

  if (btnUploadAnother) {
    btnUploadAnother.addEventListener('click', () => {
      // Reset form
      if (form) form.reset()
      if (successFieldset) successFieldset.style.display = 'none'
      if (selectionFieldset) selectionFieldset.style.display = 'block'

      // Restore last reported location
      const lastLocation = JSON.parse(localStorage.getItem('lastReportedLocation') || 'null')
      if (lastLocation && lastLocation.distrito && lastLocation.colegio) {
        // Pre-fill the selects with last location
        if (distritoSelect) {
          distritoSelect.value = lastLocation.distrito
          // Trigger change event to populate colegios
          distritoSelect.dispatchEvent(new Event('change'))
        }
        
        // Set colegio after a short delay
        setTimeout(() => {
          if (colegioSelect) colegioSelect.value = lastLocation.colegio
          // Automatically advance to data section
          showDataSection(`${lastLocation.distrito} - ${lastLocation.colegio}`)
        }, 100)
      } else {
        // Reset selects if no last location
        if (distritoSelect) distritoSelect.value = ''
        if (colegioSelect) colegioSelect.innerHTML = '<option value="">Primero selecciona un distrito</option>'
      }

      // Scroll back to top or to data section
      if (lastLocation) {
        dataFieldset?.scrollIntoView({ behavior: 'smooth' })
      } else {
        selectionFieldset?.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      // Show a final message or redirect
      alert('¡Gracias por usar el portal! Tus datos han sido guardados.')
      // Reset everything
      if (form) form.reset()
      if (successFieldset) successFieldset.style.display = 'none'
      if (selectionFieldset) selectionFieldset.style.display = 'block'
      if (distritoSelect) distritoSelect.value = ''
      if (colegioSelect) colegioSelect.innerHTML = '<option value="">Primero selecciona un distrito</option>'
      selectionFieldset?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  // Logout button
  const btnLogoutPublic = document.querySelector<HTMLButtonElement>('#btn-logout-public')
  if (btnLogoutPublic) {
    btnLogoutPublic.addEventListener('click', async () => {
      await supabase.auth.signOut()
      clearAuthContext()
      navigate('/login')
    })
  }

  // Mesas subidas (para veedores)
  const mesasSubidasListTab = document.querySelector<HTMLElement>('#mesas-subidas-tab-list')

  const renderMesasSubidas = async () => {
    if (!mesasSubidasListTab) return

    mesasSubidasListTab.innerHTML = '<p class="empty">Cargando transmisiones...</p>'

    const { data: sessionData } = await supabase.auth.getSession()
    const authId = sessionData?.session?.user?.id
    if (!authId) {
      mesasSubidasListTab.innerHTML = '<p class="empty">Debes iniciar sesión para ver tus transmisiones</p>'
      return
    }

    const { data: me, error: meErr } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('auth_id', authId)
      .single()

    if (meErr || !me?.id || me.rol !== 'veedor') {
      mesasSubidasListTab.innerHTML = '<p class="empty">No tienes permisos para esta vista</p>'
      return
    }

    const { data: transData, error: transErr } = await supabase
      .from('transmisiones')
      .select('id, mesa_id, created_at, es_valida, mesas(numero_mesa, recintos(nombre))')
      .eq('usuario_id', me.id)
      .order('created_at', { ascending: false })

    if (transErr) {
      mesasSubidasListTab.innerHTML = '<p class="empty">Error cargando transmisiones</p>'
      return
    }

    if (!transData || transData.length === 0) {
      mesasSubidasListTab.innerHTML = '<p class="empty">No has subido mesas aún</p>'
      return
    }

    const transmisionIds = transData.map((t: any) => t.id)
    const { data: incidencias } = await supabase
      .from('incidencias')
      .select('id, transmision_id, estado')
      .in('transmision_id', transmisionIds)

    const pendienteByTransmision = new Set(
      (incidencias ?? [])
        .filter((i: any) => i.estado === 'pendiente')
        .map((i: any) => i.transmision_id),
    )

    mesasSubidasListTab.innerHTML = transData
      .map((trans: any) => {
        const mesaNumero = trans.mesas?.numero_mesa ?? '?'
        const recintoNombre = (trans.mesas?.recintos as any)?.nombre ?? 'Sin recinto'
        const yaPendiente = pendienteByTransmision.has(trans.id)
        const btnLabel = yaPendiente ? 'Solicitud enviada' : 'Solicitar Reseteo'
        const btnDisabled = yaPendiente || !trans.es_valida
        return `<div class="mesa-item">
          <div class="mesa-info">
            <strong>${mesaNumero} - ${recintoNombre}</strong>
            <span>${new Date(trans.created_at).toLocaleString()}</span>
          </div>
          <button type="button" class="btn-solicitar-anulacion" data-transmision-id="${trans.id}" data-mesa-id="${trans.mesa_id}" ${btnDisabled ? 'disabled' : ''} style="background: #ff7f50; color: white;">
            ${btnLabel}
          </button>
        </div>`
      })
      .join('')

    mesasSubidasListTab.querySelectorAll<HTMLButtonElement>('.btn-solicitar-anulacion').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const transmisionId = parseInt(btn.dataset.transmisionId as string)
        const mesaId = parseInt(btn.dataset.mesaId as string)

        const description = prompt('Ingresa el justificativo de la solicitud de reseteo:')
        if (description === null) return
        if (!description.trim()) {
          alert('El justificativo no puede estar vacío')
          return
        }

        btn.disabled = true
        btn.textContent = 'Enviando...'

        const { error: incErr } = await supabase
          .from('incidencias')
          .insert({
            mesa_id: mesaId,
            transmision_id: transmisionId,
            solicitado_por: me.id,
            justificativo: description.trim(),
            estado: 'pendiente',
          })

        if (incErr) {
          alert('Error al crear la solicitud de reseteo')
          btn.disabled = false
          btn.textContent = 'Solicitar Reseteo'
          return
        }

        alert('Solicitud enviada al Supervisor')
        renderMesasSubidas()
      })
    })
  }

  renderMesasSubidas()

  // Tab navigation
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn')
  const tabContents = document.querySelectorAll<HTMLElement>('.tab-content')

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab
      
      // Remove active class from all buttons and contents
      tabButtons.forEach((b) => b.classList.remove('is-active'))
      tabContents.forEach((content) => content.style.display = 'none')

      // Add active class to clicked button and show content
      btn.classList.add('is-active')
      const activeTab = document.querySelector<HTMLElement>(`#tab-${tabName}`)
      if (activeTab) activeTab.style.display = 'block'
    })
  })
}

function bindLogin() {
  const form = document.querySelector<HTMLFormElement>('#login-form')
  if (!form) return

  const loginError = document.querySelector<HTMLElement>('#login-error')

  const setLoginError = (message: string) => {
    if (!loginError) return
    if (!message) {
      loginError.style.display = 'none'
      loginError.textContent = ''
      return
    }
    loginError.style.display = 'block'
    loginError.textContent = message
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    setLoginError('')

    const userField = document.querySelector<HTMLInputElement>('#user')
    const passField = document.querySelector<HTMLInputElement>('#pass')

    const email = normalizeLoginEmail(userField?.value ?? '')
    const password = passField?.value ?? ''

    if (!email || !password) {
      setLoginError('Ingresa usuario/correo y contraseña.')
      return
    }

    // Intentar autenticación real con Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError('Credenciales inválidas o usuario sin acceso.')
      await logAuthAttempt({ email, status: 'failed', reason: error.message })
      console.warn('[Supabase Auth] Error:', error.message)
      return
    }

    // Obtener el perfil real del usuario vía Edge Function (evita restricciones RLS recursivas)
    const { data: profileData, error: profileErr } = await supabase.functions.invoke('get-my-profile', {
      body: {},
    })

    const userData = profileData?.profile

    if (profileErr || profileData?.error || !userData?.rol) {
      setLoginError('Tu cuenta existe, pero no tiene perfil de acceso. Contacta al administrador.')
      await logAuthAttempt({ email, status: 'failed', reason: 'sin_perfil' })
      await supabase.auth.signOut()
      clearAuthContext()
      return
    }

    if (userData.activo === false) {
      setLoginError('Tu usuario está desactivado. Contacta al administrador.')
      await logAuthAttempt({ email, status: 'failed', reason: 'usuario_desactivado', userId: userData.id })
      await supabase.auth.signOut()
      clearAuthContext()
      return
    }

    const rol = userData.rol as RoleId
    const districtName = userData.districtName ?? ''

    window.localStorage.setItem('authRole', rol)
    if (districtName) {
      window.localStorage.setItem('authDistrictName', districtName)
    } else {
      window.localStorage.removeItem('authDistrictName')
    }

    await syncAuthContextFromSession()
    await logAuthAttempt({ email, status: 'success', userId: userData.id })

    if (rol === 'veedor') {
      navigate('/')
    } else {
      navigate('/panel')
    }
  })
}

function bindPanel() {
  const role = window.localStorage.getItem('authRole') as RoleId | null
  const isAdmin = role === 'admin'

  // View navigation
  const viewAdmin = document.querySelector<HTMLElement>('#view-admin')
  const viewMesas = document.querySelector<HTMLElement>('#view-mesas')
  const viewVeedores = document.querySelector<HTMLElement>('#view-veedores')
  const viewReportes = document.querySelector<HTMLElement>('#view-reportes')
  const viewTitle = document.querySelector<HTMLElement>('#view-title')
  const menuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = document.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    if (viewAdmin) viewAdmin.style.display = 'none'
    if (viewMesas) viewMesas.style.display = 'none'
    if (viewVeedores) viewVeedores.style.display = 'none'
    if (viewReportes) viewReportes.style.display = 'none'

    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    switch (viewName) {
      case 'admin':
        if (viewAdmin) viewAdmin.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Dashboard General'
        break
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

  showView(isAdmin ? 'admin' : 'mesas')

  menuLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || 'mesas'
      showView(view)
    })
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || 'mesas'
      showView(view)
    })
  })

  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-btn')
  if (!logoutButton) return

  logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut()
    clearAuthContext()
    navigate('/')
  })

  // Dashboard admin
  const adminKpis = document.querySelector<HTMLElement>('#admin-kpis')
  const adminBitacoraList = document.querySelector<HTMLElement>('#admin-bitacora-list')

  const loadAdminDashboard = async () => {
    if (!isAdmin) return

    if (adminKpis) adminKpis.innerHTML = '<p class="empty">Cargando KPIs...</p>'
    if (adminBitacoraList) adminBitacoraList.innerHTML = '<p class="empty">Cargando bitácora...</p>'

    const [{ count: totalMesas }, { count: totalTransmisiones }, { count: totalIncidencias }, { count: totalUsuarios }] = await Promise.all([
      supabase.from('mesas').select('*', { count: 'exact', head: true }),
      supabase.from('transmisiones').select('*', { count: 'exact', head: true }).eq('es_valida', true),
      supabase.from('incidencias').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
    ])

    if (adminKpis) {
      adminKpis.innerHTML = `
        <div class="chart-legend"><strong>Mesas</strong><span>${(totalMesas ?? 0).toLocaleString()}</span></div>
        <div class="chart-legend"><strong>Transmisiones válidas</strong><span>${(totalTransmisiones ?? 0).toLocaleString()}</span></div>
        <div class="chart-legend"><strong>Incidencias pendientes</strong><span>${(totalIncidencias ?? 0).toLocaleString()}</span></div>
        <div class="chart-legend"><strong>Usuarios activos</strong><span>${(totalUsuarios ?? 0).toLocaleString()}</span></div>
      `
    }

    const { data: bitacoraData, error: bitErr } = await supabase
      .from('bitacora_requests')
      .select('metodo, endpoint, status_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (bitErr) {
      if (adminBitacoraList) adminBitacoraList.innerHTML = '<p class="empty">Sin acceso a bitácora</p>'
      return
    }

    if (!adminBitacoraList) return
    if (!bitacoraData || bitacoraData.length === 0) {
      adminBitacoraList.innerHTML = '<p class="empty">No hay registros recientes</p>'
      return
    }

    adminBitacoraList.innerHTML = bitacoraData
      .map((row: any) => `<div class="mesa-item"><div class="mesa-info"><strong>${row.metodo} ${row.endpoint}</strong><span>${row.status_code ?? '-'} · ${new Date(row.created_at).toLocaleString()}</span></div></div>`)
      .join('')
  }

  loadAdminDashboard()

  const adminMunicipioSelect = document.querySelector<HTMLSelectElement>('#admin-municipio-select')
  const adminDistritoNumeroInput = document.querySelector<HTMLInputElement>('#admin-distrito-numero')
  const btnAdminCreateDistrito = document.querySelector<HTMLButtonElement>('#btn-admin-create-distrito')
  const adminDistritosList = document.querySelector<HTMLElement>('#admin-distritos-list')

  const adminRecintoDistritoSelect = document.querySelector<HTMLSelectElement>('#admin-recinto-distrito-select')
  const adminRecintoNombreInput = document.querySelector<HTMLInputElement>('#admin-recinto-nombre')
  const adminRecintoDireccionInput = document.querySelector<HTMLInputElement>('#admin-recinto-direccion')
  const btnAdminCreateRecinto = document.querySelector<HTMLButtonElement>('#btn-admin-create-recinto')
  const adminRecintosList = document.querySelector<HTMLElement>('#admin-recintos-list')

  const adminMesaRecintoSelect = document.querySelector<HTMLSelectElement>('#admin-mesa-recinto-select')
  const adminMesaNumeroInput = document.querySelector<HTMLInputElement>('#admin-mesa-numero')
  const adminMesaHabilitadosInput = document.querySelector<HTMLInputElement>('#admin-mesa-habilitados')
  const btnAdminCreateMesa = document.querySelector<HTMLButtonElement>('#btn-admin-create-mesa')
  const adminMesasList = document.querySelector<HTMLElement>('#admin-mesas-list')

  const loadMunicipiosAdmin = async () => {
    if (!isAdmin || !adminMunicipioSelect) return

    const { data, error } = await supabase
      .from('municipios')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      adminMunicipioSelect.innerHTML = '<option value="">Error cargando municipios</option>'
      return
    }

    const items = data ?? []
    adminMunicipioSelect.innerHTML = items.length
      ? items.map((m: any) => `<option value="${m.id}">${m.nombre}</option>`).join('')
      : '<option value="">Sin municipios</option>'
  }

  const loadDistritosAdmin = async () => {
    if (!isAdmin) return

    const { data, error } = await supabase
      .from('distritos')
      .select('id, nombre, numero_distrito, activo, municipios(nombre)')
      .order('numero_distrito', { ascending: true })

    if (adminRecintoDistritoSelect) {
      if (error) {
        adminRecintoDistritoSelect.innerHTML = '<option value="">Error</option>'
      } else {
        const items = data ?? []
        adminRecintoDistritoSelect.innerHTML = items.length
          ? items.map((d: any) => `<option value="${d.id}">${d.nombre} - ${d.municipios?.nombre ?? 'Sin municipio'}</option>`).join('')
          : '<option value="">Sin distritos</option>'
      }
    }

    if (adminDistritosList) {
      if (error) {
        adminDistritosList.innerHTML = '<p class="empty">Error cargando distritos</p>'
      } else if (!data || data.length === 0) {
        adminDistritosList.innerHTML = '<p class="empty">Sin distritos registrados</p>'
      } else {
        adminDistritosList.innerHTML = data
          .map((d: any) => `<div class="mesa-item"><div class="mesa-info"><strong>${d.nombre}</strong><span>${d.municipios?.nombre ?? 'Sin municipio'} · ${d.activo ? 'Activo' : 'Inactivo'}</span></div></div>`)
          .join('')
      }
    }
  }

  const loadRecintosAdmin = async () => {
    if (!isAdmin) return

    const { data, error } = await supabase
      .from('recintos')
      .select('id, nombre, activo, direccion, distritos(nombre, numero_distrito)')
      .order('nombre', { ascending: true })
      .limit(60)

    if (adminMesaRecintoSelect) {
      if (error) {
        adminMesaRecintoSelect.innerHTML = '<option value="">Error</option>'
      } else {
        const items = data ?? []
        adminMesaRecintoSelect.innerHTML = items.length
          ? items.map((r: any) => `<option value="${r.id}">${r.nombre} (${r.distritos?.nombre ?? ''})</option>`).join('')
          : '<option value="">Sin recintos</option>'
      }
    }

    if (adminRecintosList) {
      if (error) {
        adminRecintosList.innerHTML = '<p class="empty">Error cargando recintos</p>'
      } else if (!data || data.length === 0) {
        adminRecintosList.innerHTML = '<p class="empty">Sin recintos registrados</p>'
      } else {
        adminRecintosList.innerHTML = data
          .map((r: any) => `<div class="mesa-item"><div class="mesa-info"><strong>${r.nombre}</strong><span>${r.distritos?.nombre ?? 'Sin distrito'} · ${r.activo ? 'Activo' : 'Inactivo'}</span></div><button type="button" class="btn-delete-veedor" data-admin-disable-recinto="${r.id}" style="background:#dc3545;color:white">Desactivar</button></div>`)
          .join('')
      }
    }
  }

  const loadMesasAdmin = async () => {
    if (!isAdmin || !adminMesasList) return

    const { data, error } = await supabase
      .from('mesas')
      .select('id, numero_mesa, estado, activo, total_habilitados, recintos(nombre, distritos(nombre))')
      .order('id', { ascending: false })
      .limit(80)

    if (error) {
      adminMesasList.innerHTML = '<p class="empty">Error cargando mesas</p>'
      return
    }

    if (!data || data.length === 0) {
      adminMesasList.innerHTML = '<p class="empty">Sin mesas registradas</p>'
      return
    }

    adminMesasList.innerHTML = data
      .map((m: any) => `<div class="mesa-item"><div class="mesa-info"><strong>${m.numero_mesa}</strong><span>${(m.recintos as any)?.nombre ?? 'Sin recinto'} · ${(m.recintos as any)?.distritos?.nombre ?? 'Sin distrito'} · ${m.estado} · Habilitados: ${m.total_habilitados ?? 0}</span></div><button type="button" class="btn-delete-veedor" data-admin-disable-mesa="${m.id}" style="background:#dc3545;color:white">Desactivar</button></div>`)
      .join('')
  }

  const loadAdminMasterData = async () => {
    if (!isAdmin) return
    await loadMunicipiosAdmin()
    await loadDistritosAdmin()
    await loadRecintosAdmin()
    await loadMesasAdmin()
  }

  loadAdminMasterData()

  if (btnAdminCreateDistrito) {
    btnAdminCreateDistrito.addEventListener('click', async () => {
      const municipioId = parseInt(adminMunicipioSelect?.value ?? '')
      const numero = parseInt(adminDistritoNumeroInput?.value ?? '')

      if (!municipioId || !numero) {
        alert('Selecciona municipio y número de distrito')
        return
      }

      btnAdminCreateDistrito.disabled = true
      const { error } = await supabase
        .from('distritos')
        .insert({
          nombre: `Distrito ${numero}`,
          numero_distrito: numero,
          municipio_id: municipioId,
          activo: true,
        })

      btnAdminCreateDistrito.disabled = false

      if (error) {
        alert('Error creando distrito')
        return
      }

      if (adminDistritoNumeroInput) adminDistritoNumeroInput.value = ''
      await loadDistritosAdmin()
      alert('Distrito creado correctamente')
    })
  }

  if (btnAdminCreateRecinto) {
    btnAdminCreateRecinto.addEventListener('click', async () => {
      const distritoId = parseInt(adminRecintoDistritoSelect?.value ?? '')
      const nombre = adminRecintoNombreInput?.value?.trim() ?? ''
      const direccion = adminRecintoDireccionInput?.value?.trim() ?? null

      if (!distritoId || !nombre) {
        alert('Completa distrito y nombre del recinto')
        return
      }

      btnAdminCreateRecinto.disabled = true
      const { error } = await supabase
        .from('recintos')
        .insert({
          nombre,
          direccion,
          distrito_id: distritoId,
          activo: true,
        })

      btnAdminCreateRecinto.disabled = false

      if (error) {
        alert('Error creando recinto')
        return
      }

      if (adminRecintoNombreInput) adminRecintoNombreInput.value = ''
      if (adminRecintoDireccionInput) adminRecintoDireccionInput.value = ''
      await loadRecintosAdmin()
      alert('Recinto creado correctamente')
    })
  }

  if (btnAdminCreateMesa) {
    btnAdminCreateMesa.addEventListener('click', async () => {
      const recintoId = parseInt(adminMesaRecintoSelect?.value ?? '')
      const numeroMesa = adminMesaNumeroInput?.value?.trim() ?? ''
      const habilitados = parseInt(adminMesaHabilitadosInput?.value ?? '0') || 0

      if (!recintoId || !numeroMesa) {
        alert('Completa recinto y número de mesa')
        return
      }

      btnAdminCreateMesa.disabled = true
      const { error } = await supabase
        .from('mesas')
        .insert({
          numero_mesa: numeroMesa,
          recinto_id: recintoId,
          total_habilitados: habilitados,
          estado: 'pendiente',
          activo: true,
        })

      btnAdminCreateMesa.disabled = false

      if (error) {
        alert('Error creando mesa')
        return
      }

      if (adminMesaNumeroInput) adminMesaNumeroInput.value = ''
      if (adminMesaHabilitadosInput) adminMesaHabilitadosInput.value = '0'
      await loadMesasAdmin()
      alert('Mesa creada correctamente')
    })
  }

  if (adminRecintosList) {
    adminRecintosList.addEventListener('click', async (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-admin-disable-recinto]')
      if (!btn) return
      const id = parseInt(btn.dataset.adminDisableRecinto as string)
      btn.disabled = true
      const { error } = await supabase.from('recintos').update({ activo: false }).eq('id', id)
      if (error) {
        alert('Error desactivando recinto')
        btn.disabled = false
        return
      }
      await loadRecintosAdmin()
      await loadMesasAdmin()
    })
  }

  if (adminMesasList) {
    adminMesasList.addEventListener('click', async (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-admin-disable-mesa]')
      if (!btn) return
      const id = parseInt(btn.dataset.adminDisableMesa as string)
      btn.disabled = true
      const { error } = await supabase.from('mesas').update({ activo: false }).eq('id', id)
      if (error) {
        alert('Error desactivando mesa')
        btn.disabled = false
        return
      }
      await loadMesasAdmin()
    })
  }

  // Supervisor college search
  const supervisorDistrict = getSupervisorDistrict()
  const input = document.querySelector<HTMLInputElement>('#supervisor-colegio-search')
  const results = document.querySelector<HTMLUListElement>('#supervisor-colegio-results')
  const mesasContainer = document.querySelector<HTMLElement>('#mesas-container')
  const mesasList = document.querySelector<HTMLElement>('#mesas-list')
  const selectedColegioName = document.querySelector<HTMLElement>('#selected-colegio-name')
  const btnChangeCollegio = document.querySelector<HTMLButtonElement>('#btn-change-colegio')

  if (input && results) {
    const paint = (term: string) => {
      const value = term.trim().toLowerCase()
      if (!value) {
        results.innerHTML = ''
        return
      }
      // Filter colleges in supervisor's district
      const items = colegiosMock.filter(
        (item) => item.nombre.toLowerCase().includes(value) && item.distrito === supervisorDistrict
      )
      results.innerHTML = items.length
        ? items.map((item) => `<li data-colegio="${item.nombre}" data-distrito="${item.distrito}"><strong>${item.nombre}</strong><span>${item.distrito}</span></li>`).join('')
        : '<li class="empty">Sin coincidencias</li>'
    }

    input.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement
      paint(target.value)
    })

    // Click on search result shows mesas
    results.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        const colegioName = li.dataset.colegio
        if (selectedColegioName) selectedColegioName.textContent = colegioName || ''
        if (input) input.value = ''
        if (results) results.innerHTML = ''

        // Show mesas for this college
        const collegioBases = mesas.filter((m) => m.colegio === colegioName)

        if (mesasList && collegioBases.length) {
          const mesasHtml = collegioBases
            .map((mesa) => {
              const statusClass = mesa.estado === 'transmitida' ? 'mesa-cerrada' : 'mesa-abierta'
              const estadoMap: Record<string, string> = {
                pendiente: '🟡 Pendiente',
                transmitida: '🟢 Transmitida',
                incidencia: '🔴 Incidencia',
                no_validada: '⚪ No validada',
              }
              const statusText = estadoMap[mesa.estado] ?? mesa.estado
              return `<div class="mesa-item ${statusClass}">
                <div class="mesa-info">
                  <strong>${mesa.numero}</strong>
                  <span>${statusText}</span>
                </div>
                <!-- <button type="button" class="btn-view-mesa" data-mesa="${mesa.id}">Ver Detalles</button> -->
              </div>`
            })
            .join('')
          mesasList.innerHTML = mesasHtml
        }

        if (mesasContainer) mesasContainer.style.display = 'block'
        input?.scrollIntoView({ behavior: 'smooth' })
      }
    })

    // Dropdown para mostrar todos los colegios del distrito ordenados alfabéticamente
    const btnSupervisorDropdown = document.querySelector<HTMLButtonElement>('#supervisor-colegio-search-dropdown')
    if (btnSupervisorDropdown && results) {
      btnSupervisorDropdown.addEventListener('click', () => {
        // Toggle: si hay resultados, cerrar; si no, abrir
        if (results.innerHTML !== '') {
          results.innerHTML = ''
        } else {
          const colegiosDistrict = colegiosMock
            .filter((item) => item.distrito === supervisorDistrict)
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
          results.innerHTML = colegiosDistrict
            .map((item) => `<li data-colegio="${item.nombre}" data-distrito="${item.distrito}"><strong>${item.nombre}</strong><span>${item.distrito}</span></li>`)
            .join('')
          input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }

    // Close dropdown when clicking outside or pressing Escape
    if (results && input) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (!input?.contains(target) && !btnSupervisorDropdown?.contains(target) && results.innerHTML !== '') {
          results.innerHTML = ''
        }
      })

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && results.innerHTML !== '') {
          results.innerHTML = ''
        }
      })
    }
  }

  // Change college button
  if (btnChangeCollegio) {
    btnChangeCollegio.addEventListener('click', () => {
      if (mesasContainer) mesasContainer.style.display = 'none'
      if (input) input.value = ''
      if (results) results.innerHTML = ''
      input?.focus()
    })
  }

  // Veedores management
  const veedorColegioSearch = document.querySelector<HTMLInputElement>('#veedor-colegio-search')
  const veedorColegioResults = document.querySelector<HTMLUListElement>('#veedor-colegio-results')
  const veedorFormDiv = document.querySelector<HTMLElement>('#veedor-form')
  const veedorColegioSelected = document.querySelector<HTMLElement>('#veedor-colegio-selected')
  const veedorUsuarioInput = document.querySelector<HTMLInputElement>('#veedor-usuario')
  const veedorPasswordInput = document.querySelector<HTMLInputElement>('#veedor-password')
  const btnAgregarVeedor = document.querySelector<HTMLButtonElement>('#btn-agregar-veedor')
  const veedoresList = document.querySelector<HTMLElement>('#veedores-list')

  let selectedVeedorColegio = ''

  // Search for colleges
  if (veedorColegioSearch && veedorColegioResults) {
    veedorColegioSearch.addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value.trim().toLowerCase()
      if (!value) {
        veedorColegioResults.innerHTML = ''
        return
      }

      const colegios = colegiosMock.filter(
        (c) => c.nombre.toLowerCase().includes(value) && c.distrito === supervisorDistrict
      )

      veedorColegioResults.innerHTML = colegios.length
        ? colegios
            .map((c) => `<li data-colegio="${c.nombre}"><strong>${c.nombre}</strong><span>${c.distrito}</span></li>`)
            .join('')
        : '<li class="empty">Sin resultados</li>'
    })

    veedorColegioResults.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        selectedVeedorColegio = li.dataset.colegio || ''
        if (veedorColegioSelected) veedorColegioSelected.textContent = selectedVeedorColegio
        if (veedorColegioSearch) veedorColegioSearch.value = ''
        veedorColegioResults.innerHTML = ''
        if (veedorFormDiv) veedorFormDiv.style.display = 'block'
        veedorUsuarioInput?.focus()
      }
    })

    // Dropdown para mostrar todos los colegios del distrito ordenados alfabéticamente
    const btnVeedorDropdown = document.querySelector<HTMLButtonElement>('#veedor-colegio-search-dropdown')
    if (btnVeedorDropdown && veedorColegioResults) {
      btnVeedorDropdown.addEventListener('click', () => {
        // Toggle: si hay resultados, cerrar; si no, abrir
        if (veedorColegioResults.innerHTML !== '') {
          veedorColegioResults.innerHTML = ''
        } else {
          const colegiosDistrict = colegiosMock
            .filter((c) => c.distrito === supervisorDistrict)
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
          veedorColegioResults.innerHTML = colegiosDistrict
            .map((c) => `<li data-colegio="${c.nombre}"><strong>${c.nombre}</strong><span>${c.distrito}</span></li>`)
            .join('')
          veedorColegioSearch?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }

    // Close dropdown when clicking outside or pressing Escape
    if (veedorColegioResults && veedorColegioSearch) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (!veedorColegioSearch?.contains(target) && !btnVeedorDropdown?.contains(target) && veedorColegioResults.innerHTML !== '') {
          veedorColegioResults.innerHTML = ''
        }
      })

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && veedorColegioResults.innerHTML !== '') {
          veedorColegioResults.innerHTML = ''
        }
      })
    }
  }

  // ─── VEEDORES/DELEGADOS — Backend real con Supabase ──────────────────────
  const renderVeedores = async () => {
    if (!veedoresList) return
    veedoresList.innerHTML = '<p class="empty" style="color:#aaa">Cargando delegados...</p>'

    // Cargar usuarios con rol veedor del distrito del supervisor
    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id

    // Usar any para evitar incompatibilidad de tipos en el query builder de Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryBuilder: any = supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, recintos(nombre)')

    if (!isAdmin) {
      queryBuilder = queryBuilder
        .eq('rol', 'veedor')
        .eq('activo', true)
    }

    // Filtrar por distrito si no es admin
    if (authUserId) {
      const { data: me } = await supabase
        .from('usuarios')
        .select('rol, distrito_id')
        .eq('auth_id', authUserId)
        .single()
      if (me?.rol !== 'admin' && me?.distrito_id) {
        queryBuilder = supabase
          .from('usuarios')
          .select('id, nombre, apellido, email, rol, activo, recintos!inner(nombre, distrito_id)')
          .eq('rol', 'veedor')
          .eq('activo', true)
          .eq('recintos.distrito_id', me.distrito_id)
      }
    }

    const { data: usuariosData, error } = await queryBuilder

    if (error) {
      veedoresList.innerHTML = '<p class="empty" style="color:#c00">Error cargando delegados</p>'
      console.error('[Supabase] Error cargando veedores:', error)
      return
    }

    if (!usuariosData || usuariosData.length === 0) {
      veedoresList.innerHTML = `<p class="empty">${isAdmin ? 'No hay usuarios registrados' : 'No hay delegados registrados'}</p>`
      return
    }

    veedoresList.innerHTML = usuariosData
      .map((v: any) => {
        const isActive = v.activo !== false
        const mainAction = isActive
          ? `<button type="button" class="btn-delete-veedor" data-id="${v.id}" style="background:#dc3545;color:white">Desactivar</button>`
          : `<button type="button" class="btn-activate-user" data-id="${v.id}" style="background:#28a745;color:white">Activar</button>`

        const resetAction = isAdmin
          ? `<button type="button" class="btn-reset-pass-user" data-email="${v.email}" style="background:#6c757d;color:white">Reset pass</button>`
          : ''

        return `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${v.nombre} ${v.apellido}</strong>
            <span>${v.email}</span>
            <small style="color:#888;display:block">${(v.recintos as any)?.nombre ?? 'Sin recinto asignado'} · ${isActive ? 'Activo' : 'Inactivo'}</small>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${mainAction}
            ${resetAction}
          </div>
        </div>`
      })
      .join('')

    // Desactivar delegado (no eliminar, solo activo = false)
    veedoresList.querySelectorAll<HTMLButtonElement>('.btn-delete-veedor').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id as string)
        btn.disabled = true
        btn.textContent = '...'
        const { error: delErr } = await supabase
          .from('usuarios')
          .update({ activo: false })
          .eq('id', id)
        if (delErr) {
          alert('Error al desactivar delegado')
          console.error(delErr)
        } else {
          renderVeedores()
        }
      })
    })

    veedoresList.querySelectorAll<HTMLButtonElement>('.btn-activate-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id as string)
        btn.disabled = true
        btn.textContent = '...'
        const { error: upErr } = await supabase
          .from('usuarios')
          .update({ activo: true })
          .eq('id', id)
        if (upErr) {
          alert('Error al activar usuario')
          btn.disabled = false
          btn.textContent = 'Activar'
        } else {
          renderVeedores()
        }
      })
    })

    veedoresList.querySelectorAll<HTMLButtonElement>('.btn-reset-pass-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email ?? ''
        if (!email) return
        const newPassword = prompt(`Nueva contraseña para ${email}:`)
        if (newPassword === null) return
        if (newPassword.trim().length < 8) {
          alert('La contraseña debe tener al menos 8 caracteres')
          return
        }

        btn.disabled = true
        btn.textContent = '...'

        const { data, error } = await supabase.functions.invoke('admin-reset-password', {
          body: {
            email,
            newPassword: newPassword.trim(),
          },
        })

        btn.disabled = false
        btn.textContent = 'Reset pass'

        if (error || data?.error) {
          alert(`Error reseteando contraseña: ${data?.error ?? error?.message ?? 'desconocido'}`)
          return
        }

        alert('Contraseña reseteada correctamente')
      })
    })
  }

  if (btnAgregarVeedor) {
    btnAgregarVeedor.addEventListener('click', async () => {
      const email = veedorUsuarioInput?.value?.trim() || ''
      const password = veedorPasswordInput?.value || ''

      if (!selectedVeedorColegio || !email || !password) {
        alert('Por favor completa todos los campos (email y contraseña)')
        return
      }

      // Buscar el recinto_id por nombre de colegio
      const recinto = colegiosMock.find((c) => c.nombre === selectedVeedorColegio)
      if (!recinto?.recinto_id) {
        alert('No se puede determinar el recinto del colegio seleccionado')
        return
      }

      btnAgregarVeedor.disabled = true
      btnAgregarVeedor.textContent = 'Creando...'

      // Llamar a la Edge Function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          nombre: email.split('@')[0],  // nombre provisional
          apellido: '-',
          rol: 'veedor',
          recinto_id: recinto.recinto_id,
        },
      })

      btnAgregarVeedor.disabled = false
      btnAgregarVeedor.textContent = 'Crear Delegado'

      if (error || data?.error) {
        alert(`Error: ${data?.error ?? error?.message ?? 'Error desconocido'}`)
        console.error('[Edge Function] Error:', error, data)
        return
      }

      if (veedorUsuarioInput) veedorUsuarioInput.value = ''
      if (veedorPasswordInput) veedorPasswordInput.value = ''
      if (veedorColegioSearch) veedorColegioSearch.value = ''
      if (veedorColegioSelected) veedorColegioSelected.textContent = ''
      selectedVeedorColegio = ''
      if (veedorFormDiv) veedorFormDiv.style.display = 'none'

      alert(`✅ Delegado creado exitosamente`)
      renderVeedores()
    })
  }

  renderVeedores()

  // ─── REPORTES: Gráfico de votos desde vista_monitoreo ───────────────────
  const pieChartSvg = document.querySelector<SVGElement>('#pie-chart')
  const chartLegend = document.querySelector<HTMLElement>('#chart-legend')
  const specialVotesSummary = document.querySelector<HTMLElement>('#special-votes-summary')
  const reportesSection = document.querySelector<HTMLElement>('#view-reportes article.card')

  // Inyectar selector de cargo y estado de carga dinámicamente
  if (reportesSection) {
    const cargoFilter = document.createElement('div')
    cargoFilter.id = 'cargo-filter'
    cargoFilter.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;'
    cargoFilter.innerHTML = `
      <button type="button" class="cargo-tab is-active" data-cargo="alcalde">Alcalde</button>
      <button type="button" class="cargo-tab" data-cargo="concejal">Concejal</button>
    `
    const cardsContent = reportesSection.querySelector('.charts-container')
    if (cardsContent) reportesSection.insertBefore(cargoFilter, cardsContent)
  }

  // Función para dibujar el gráfico SVG de torta
  const drawPieChart = (datos: { partido: string; sigla: string; color: string; total: number }[]) => {
    if (!pieChartSvg || !chartLegend) return

    const total = datos.reduce((acc, d) => acc + d.total, 0)

    if (total === 0 || datos.length === 0) {
      pieChartSvg.innerHTML = `<text x="140" y="145" text-anchor="middle" fill="#999" font-size="14">Sin datos aún</text>`
      chartLegend.innerHTML = `<p class="empty" style="color:#999;font-size:13px;">Las transmisiones validadas aparecerán aquí en tiempo real.</p>`
      return
    }

    let angle = 0
    let svgPaths = ''
    chartLegend.innerHTML = ''

    datos.forEach((d) => {
      const pct = (d.total / total) * 100
      const sliceAngle = (pct / 100) * 360

      const startRad = (angle * Math.PI) / 180
      const endRad = ((angle + sliceAngle) * Math.PI) / 180
      const x1 = 140 + 120 * Math.cos(startRad - Math.PI / 2)
      const y1 = 140 + 120 * Math.sin(startRad - Math.PI / 2)
      const x2 = 140 + 120 * Math.cos(endRad - Math.PI / 2)
      const y2 = 140 + 120 * Math.sin(endRad - Math.PI / 2)
      const largeArc = sliceAngle > 180 ? 1 : 0

      svgPaths += `<path d="M 140 140 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 120 120 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z"
        fill="${d.color}" stroke="white" stroke-width="2"/>`

      chartLegend.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:16px;height:16px;background:${d.color};border-radius:3px;flex-shrink:0;"></div>
          <div>
            <strong style="font-size:14px;color:#2d1630;">${d.partido}</strong>
            <span style="font-size:12px;color:#6b3f67;display:block;">${d.total.toLocaleString()} votos (${pct.toFixed(1)}%)</span>
          </div>
        </div>`

      angle += sliceAngle
    })

    pieChartSvg.innerHTML = svgPaths
  }

  // Función para obtener datos reales de Supabase
  const loadChartData = async (tipoCargo: 'alcalde' | 'concejal') => {
    if (!pieChartSvg || !chartLegend) return

    // Mostrar estado de carga
    pieChartSvg.innerHTML = `<text x="140" y="145" text-anchor="middle" fill="#aaa" font-size="13">Cargando...</text>`
    chartLegend.innerHTML = ''

    // Obtener el distrito_id del supervisor desde la sesión actual
    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id

    let distritoIdFiltro: number | null = null

    if (authUserId) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('distrito_id, rol')
        .eq('auth_id', authUserId)
        .single()

      // Admin ve todo el municipio; supervisor2/supervisor1 ve solo su distrito
      if (userData?.rol !== 'admin' && userData?.distrito_id) {
        distritoIdFiltro = userData.distrito_id
      }
    }

    // Consultar vista_monitoreo con filtro de cargo y opcionalmente distrito
    let query = supabase
      .from('vista_monitoreo')
      .select('partido_id, partido, sigla, color_hex, total_votos')
      .eq('tipo_cargo', tipoCargo)

    if (distritoIdFiltro !== null) {
      query = query.eq('distrito_id', distritoIdFiltro)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Supabase] Error cargando vista_monitoreo:', error)
      pieChartSvg.innerHTML = `<text x="140" y="145" text-anchor="middle" fill="#c00" font-size="12">Error al cargar</text>`
      return
    }

    // Agrupar por partido (puede haber múltiples distritos si es admin)
    const agrupado: Record<number, { partido: string; sigla: string; color: string; total: number }> = {}
    ;(data ?? []).forEach((row: any) => {
      if (!agrupado[row.partido_id]) {
        // Usar color real del array partidos cargado (fallback al de la vista)
        const partidoLocal = partidos.find((p) => p.id === row.partido_id)
        agrupado[row.partido_id] = {
          partido: row.partido,
          sigla: row.sigla,
          color: partidoLocal?.color ?? row.color_hex ?? '#888',
          total: 0,
        }
      }
      agrupado[row.partido_id].total += row.total_votos ?? 0
    })

    const datos = Object.values(agrupado).sort((a, b) => b.total - a.total)
    drawPieChart(datos)
  }

  const loadSpecialVotes = async () => {
    if (!specialVotesSummary) return

    specialVotesSummary.innerHTML = '<p class="empty" style="color:#999">Cargando votos especiales...</p>'

    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id

    let distritoIdFiltro: number | null = null

    if (authUserId) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('distrito_id, rol')
        .eq('auth_id', authUserId)
        .single()

      if (userData?.rol !== 'admin' && userData?.distrito_id) {
        distritoIdFiltro = userData.distrito_id
      }
    }

    let mesaIdsFiltro: number[] | null = null

    if (distritoIdFiltro !== null) {
      const { data: mesasFiltradas, error: mesasErr } = await supabase
        .from('mesas')
        .select('id, recintos!inner(distrito_id)')
        .eq('recintos.distrito_id', distritoIdFiltro)

      if (mesasErr) {
        specialVotesSummary.innerHTML = '<p class="empty" style="color:#c00">Error cargando votos especiales</p>'
        return
      }

      mesaIdsFiltro = (mesasFiltradas ?? []).map((m: any) => m.id)
      if (mesaIdsFiltro.length === 0) {
        specialVotesSummary.innerHTML = '<p class="empty">Sin datos de votos especiales</p>'
        return
      }
    }

    let transQuery = supabase
      .from('transmisiones')
      .select('id, mesa_id')
      .eq('es_valida', true)

    if (mesaIdsFiltro) {
      transQuery = transQuery.in('mesa_id', mesaIdsFiltro)
    }

    const { data: transValidas, error: transErr } = await transQuery
    if (transErr) {
      specialVotesSummary.innerHTML = '<p class="empty" style="color:#c00">Error cargando votos especiales</p>'
      return
    }

    const transmisionIds = (transValidas ?? []).map((t: any) => t.id)
    if (transmisionIds.length === 0) {
      specialVotesSummary.innerHTML = '<p class="empty">Sin transmisiones válidas para consolidar</p>'
      return
    }

    const { data: especialesData, error: espErr } = await supabase
      .from('votos_especiales')
      .select('votos_blancos, votos_nulos, votos_validos')
      .in('transmision_id', transmisionIds)

    if (espErr) {
      specialVotesSummary.innerHTML = '<p class="empty" style="color:#c00">Error cargando votos especiales</p>'
      return
    }

    const total = (especialesData ?? []).reduce(
      (acc: { blancos: number; nulos: number; validos: number }, row: any) => {
        acc.blancos += row.votos_blancos ?? 0
        acc.nulos += row.votos_nulos ?? 0
        acc.validos += row.votos_validos ?? 0
        return acc
      },
      { blancos: 0, nulos: 0, validos: 0 },
    )

    specialVotesSummary.innerHTML = `
      <div class="chart-legend"><strong>Votos válidos</strong><span>${total.validos.toLocaleString()}</span></div>
      <div class="chart-legend"><strong>Votos blancos</strong><span>${total.blancos.toLocaleString()}</span></div>
      <div class="chart-legend"><strong>Votos nulos</strong><span>${total.nulos.toLocaleString()}</span></div>
    `
  }

  // Cargar datos al entrar a la sección de reportes
  loadChartData('alcalde')
  loadSpecialVotes()

  // Escuchar cambio de cargo
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#cargo-filter .cargo-tab')
    if (!btn) return
    document.querySelectorAll<HTMLButtonElement>('#cargo-filter .cargo-tab').forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    const cargo = btn.dataset.cargo as 'alcalde' | 'concejal'
    loadChartData(cargo)
  })

  // ─── REALTIME: actualización en vivo ────────────────────────────────────
  const getActiveCargo = (): 'alcalde' | 'concejal' => {
    const activeBtn = document.querySelector<HTMLButtonElement>('#cargo-filter .cargo-tab.is-active')
    return (activeBtn?.dataset.cargo as 'alcalde' | 'concejal') ?? 'alcalde'
  }

  const realtimeChannel = supabase
    .channel('panel-monitoreo')
    // Nueva transmisión → refrescar gráfico
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transmisiones' }, () => {
      loadChartData(getActiveCargo())
      loadSpecialVotes()
      loadAdminDashboard()
    })
    // Mesa actualizada → actualizar badge de estado en la lista visible
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mesas' }, (payload: { new: unknown }) => {
      loadChartData(getActiveCargo())
      loadSpecialVotes()
      loadAdminDashboard()
      const mesaId = (payload.new as { id?: number })?.id
      if (mesaId) {
        const mesaItem = document.querySelector<HTMLElement>(`.mesa-item[data-mesa-id="${mesaId}"]`)
        if (mesaItem) {
          const estadoMap: Record<string, string> = {
            transmitida: '🟢 Transmitida',
            pendiente: '🟡 Pendiente',
            incidencia: '🔴 Incidencia',
            no_validada: '⚪ No validada',
          }
          const statusSpan = mesaItem.querySelector('span')
          const nuevoEstado = (payload.new as { estado?: string })?.estado ?? ''
          if (statusSpan) statusSpan.textContent = estadoMap[nuevoEstado] ?? nuevoEstado
        }
      }
    })
    // Nueva incidencia → refrescar gráfico
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidencias' }, () => {
      loadChartData(getActiveCargo())
      loadSpecialVotes()
      loadAdminDashboard()
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votos_especiales' }, () => {
      loadSpecialVotes()
    })
    .subscribe((status: string) => {
      console.log('[Realtime] Panel channel status:', status)
    })

  // Limpiar canal al navegar a otra ruta
  const cleanupRealtime = () => {
    supabase.removeChannel(realtimeChannel)
    window.removeEventListener('popstate', cleanupRealtime)
  }
  window.addEventListener('popstate', cleanupRealtime)
}

async function bindColegio() {
  // View navigation
  const viewMesasColegio = document.querySelector<HTMLElement>('#view-mesas-colegio')
  const viewCrearDelegados = document.querySelector<HTMLElement>('#view-crear-delegados')
  const viewSolicitudes = document.querySelector<HTMLElement>('#view-solicitudes')
  const viewTitleColegio = document.querySelector<HTMLElement>('#view-title-colegio')
  const menuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = document.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    if (viewMesasColegio) viewMesasColegio.style.display = 'none'
    if (viewCrearDelegados) viewCrearDelegados.style.display = 'none'
    if (viewSolicitudes) viewSolicitudes.style.display = 'none'

    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    switch (viewName) {
      case 'mesas-colegio':
        if (viewMesasColegio) viewMesasColegio.style.display = 'block'
        if (viewTitleColegio) viewTitleColegio.textContent = 'Mesas del Colegio'
        break
      case 'crear-delegados':
        if (viewCrearDelegados) viewCrearDelegados.style.display = 'block'
        if (viewTitleColegio) viewTitleColegio.textContent = 'Crear Delegados'
        break
      case 'solicitudes':
        if (viewSolicitudes) viewSolicitudes.style.display = 'block'
        if (viewTitleColegio) viewTitleColegio.textContent = 'Solicitudes de Anulación'
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
      const view = btn.dataset.view || 'mesas-colegio'
      showView(view)
    })
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || 'mesas-colegio'
      showView(view)
    })
  })

  // Logout button
  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-btn')
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await supabase.auth.signOut()
      clearAuthContext()
      navigate('/')
    })
  }

  // Mesas del colegio
  const mesasColegioList = document.querySelector<HTMLElement>('#mesas-colegio-list')
  if (mesasColegioList) {
    const collegioBases = mesas.filter((m) => m.colegio === 'Colegio Central')
    if (collegioBases.length) {
      const mesasHtml = collegioBases
        .map((mesa) => {
          const statusClass = mesa.estado === 'transmitida' ? 'mesa-cerrada' : 'mesa-abierta'
          const estadoMap: Record<string, string> = {
            pendiente: '🟡 Pendiente',
            transmitida: '🟢 Transmitida',
            incidencia: '🔴 Incidencia',
            no_validada: '⚪ No validada',
          }
          const statusText = estadoMap[mesa.estado] ?? mesa.estado
          return `<div class="mesa-item ${statusClass}">
            <div class="mesa-info">
              <strong>${mesa.numero}</strong>
              <span>${statusText}</span>
            </div>
          </div>`
        })
        .join('')
      mesasColegioList.innerHTML = mesasHtml
    } else {
      mesasColegioList.innerHTML = '<p class="empty">No hay mesas registradas</p>'
    }
  }

  // Obtener recinto_id del supervisor1 actual
  const { data: sessionForColegio } = await supabase.auth.getSession()
  const authUserIdColegio = sessionForColegio?.session?.user?.id
  let miRecintoId: number | null = null
  if (authUserIdColegio) {
    const { data: meData } = await supabase
      .from('usuarios')
      .select('recinto_id')
      .eq('auth_id', authUserIdColegio)
      .single()
    miRecintoId = meData?.recinto_id ?? null
  }

  // Inputs y botones para crear delegados
  const delegadoUsuarioInput = document.querySelector<HTMLInputElement>('#colegio-delegado-usuario')
  const delegadoPasswordInput = document.querySelector<HTMLInputElement>('#colegio-delegado-password')
  const btnCrearDelegadoColegio = document.querySelector<HTMLButtonElement>('#btn-crear-delegado-colegio')
  const delegadosColegioList = document.querySelector<HTMLElement>('#delegados-colegio-list')

  // ─── DELEGADOS DEL COLEGIO — Backend real con Supabase ────────────
  const renderDelegados = async () => {
    if (!delegadosColegioList) return
    delegadosColegioList.innerHTML = '<p class="empty" style="color:#aaa">Cargando...</p>'

    const { data: delegadosData, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, recinto_id')
      .eq('rol', 'veedor')
      .eq('activo', true)
      .eq('recinto_id', miRecintoId ?? 0)

    if (error) {
      delegadosColegioList.innerHTML = '<p class="empty" style="color:#c00">Error cargando delegados</p>'
      console.error('[Supabase] bindColegio error:', error)
      return
    }

    if (!delegadosData || delegadosData.length === 0) {
      delegadosColegioList.innerHTML = '<p class="empty">No hay delegados registrados en este colegio</p>'
      return
    }

    delegadosColegioList.innerHTML = delegadosData
      .map((d: any) => `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${d.nombre} ${d.apellido}</strong>
            <span>${d.email}</span>
          </div>
          <button type="button" class="btn-delete-delegado" data-id="${d.id}" style="background:#dc3545;color:white">Desactivar</button>
        </div>`)
      .join('')

    delegadosColegioList.querySelectorAll<HTMLButtonElement>('.btn-delete-delegado').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id as string)
        btn.disabled = true
        btn.textContent = '...'
        const { error: delErr } = await supabase
          .from('usuarios')
          .update({ activo: false })
          .eq('id', id)
        if (delErr) {
          alert('Error al desactivar delegado')
        } else {
          renderDelegados()
        }
      })
    })
  }

  if (btnCrearDelegadoColegio) {
    btnCrearDelegadoColegio.addEventListener('click', async () => {
      const email = delegadoUsuarioInput?.value?.trim() || ''
      const password = delegadoPasswordInput?.value || ''

      if (!email || !password) {
        alert('Por favor completa todos los campos')
        return
      }

      if (!miRecintoId) {
        alert('No se puede determinar el recinto de este colegio. Inicia sesión nuevamente.')
        return
      }

      btnCrearDelegadoColegio.disabled = true
      btnCrearDelegadoColegio.textContent = 'Creando...'

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          nombre: email.split('@')[0],
          apellido: '-',
          rol: 'veedor',
          recinto_id: miRecintoId,
        },
      })

      btnCrearDelegadoColegio.disabled = false
      btnCrearDelegadoColegio.textContent = 'Crear Delegado'

      if (error || data?.error) {
        alert(`Error: ${data?.error ?? error?.message ?? 'Error desconocido'}`)
        return
      }

      if (delegadoUsuarioInput) delegadoUsuarioInput.value = ''
      if (delegadoPasswordInput) delegadoPasswordInput.value = ''
      alert('✅ Delegado creado exitosamente')
      renderDelegados()
    })
  }

  renderDelegados()

  // Solicitudes de anulación — cargar desde Supabase (tabla incidencias)
  const solicitudesList = document.querySelector<HTMLElement>('#solicitudes-list')
  if (solicitudesList) {
    const loadSolicitudes = async () => {
      solicitudesList.innerHTML = '<p class="empty" style="color:#aaa">Cargando...</p>'

      const { data: incidenciasData, error } = await supabase
        .from('incidencias')
        .select('id, justificativo, estado, created_at, mesas(numero_mesa, recintos(nombre))')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })

      if (error) {
        solicitudesList.innerHTML = '<p class="empty" style="color:#c00">Error cargando solicitudes</p>'
        return
      }

      if (!incidenciasData || incidenciasData.length === 0) {
        solicitudesList.innerHTML = '<p class="empty">No hay solicitudes de anulación pendientes</p>'
        return
      }

      solicitudesList.innerHTML = incidenciasData
        .map((s: any) => `<div class="mesa-item">
            <div class="mesa-info">
              <strong>Mesa ${s.mesas?.numero_mesa ?? '?'} — ${(s.mesas?.recintos as any)?.nombre ?? '?'}</strong>
              <span style="color:#555;font-size:13px">${s.justificativo}</span>
              <small style="color:#999">${new Date(s.created_at).toLocaleString()}</small>
            </div>
            <button type="button" class="btn-resolver-incidencia" data-id="${s.id}"
              style="background:#28a745;color:white">
              Resolver (Resetear mesa)
            </button>
          </div>`)
        .join('')

      // Resolver incidencia = resetear mesa
      solicitudesList.querySelectorAll<HTMLButtonElement>('.btn-resolver-incidencia').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id as string)
          btn.disabled = true
          btn.textContent = 'Procesando...'
          const { error: resErr } = await supabase
            .from('incidencias')
            .update({ estado: 'resuelto' })
            .eq('id', id)
          if (resErr) {
            alert('Error al resolver la incidencia')
            console.error(resErr)
            btn.disabled = false
            btn.textContent = 'Resolver (Resetear mesa)'
          } else {
            alert('✅ Mesa reseteada. El veedor podrá retransmitirla.')
            loadSolicitudes()
          }
        })
      })
    }

    loadSolicitudes()
  }
}

function bindNavigationLinks() {
  const navTargets = document.querySelectorAll<HTMLElement>('[data-go]')
  navTargets.forEach((target) => {
    target.addEventListener('click', () => {
      const path = target.dataset.go
      if (path === '/' || path === '/login' || path === '/panel') {
        navigate(path)
      }
    })
  })
}

async function renderRoute() {
  const route = getRoute()

  // Permitir /login sin estar logueado, pero redirigir a /login desde otras rutas
  if (route !== 'login' && !(await isLoggedIn())) {
    navigate('/login')
    return
  }

  if (route === 'home') rootApp.innerHTML = homeTemplate()
  if (route === 'login') rootApp.innerHTML = loginTemplate()
  if (route === 'panel') rootApp.innerHTML = panelTemplate()

  document.body.classList.remove('route-home', 'route-login', 'route-panel')
  document.body.classList.add(`route-${route}`)

  bindNavigationLinks()
  if (route === 'home') bindPublicHome()
  if (route === 'login') bindLogin()
  if (route === 'panel') {
    const role = window.localStorage.getItem('authRole')
    if (role === 'supervisor1') {
      bindColegio()
    } else {
      bindPanel()
    }
  }
}

window.addEventListener('popstate', renderRoute)

// Arrancar: sincronizar sesión de Supabase → luego cargar catálogos → renderizar
;(async () => {
  await syncAuthContextFromSession()

  await loadCatalogos()
  renderRoute()
})()

supabase.auth.onAuthStateChange(async () => {
  await syncAuthContextFromSession()
})
