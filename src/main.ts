import './style.css'
import { supabase } from './utils/supabase'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor #app')
}

const rootApp = app

type RouteId = 'home' | 'login' | 'panel'
type RoleId = 'veedor' | 'distrito' | 'colegio' | 'admin'

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
  // ⚠️ SEGURIDAD: Solo permitir acceso si hay sesión REAL en Supabase Auth
  // NO usar fallback de localStorage (es un agujero de seguridad)

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData?.session?.user) {
    // No hay sesión de Supabase Auth → NO permitir acceso
    window.localStorage.removeItem('authRole')
    return false
  }

  // Validación adicional: verificar que el usuario tenga rol en la tabla usuarios
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_id', sessionData.session.user.id)
    .eq('activo', true)
    .single()

  if (!userData) {
    // Usuario no tiene rol o está desactivado → NO permitir acceso
    window.localStorage.removeItem('authRole')
    await supabase.auth.signOut()
    return false
  }

  // ✅ Sesión válida y usuario activo → permitir acceso
  // Asegurar que localStorage está sincronizado con la BD
  window.localStorage.setItem('authRole', userData.rol)
  return true
}

function getRoleLabel() {
  const role = window.localStorage.getItem('authRole') as RoleId | null
  if (role === 'admin') return 'Administrador'
  if (role === 'distrito') return 'Supervisor de Distrito'
  if (role === 'colegio') return 'Responsable de Colegio'
  if (role === 'veedor') return 'Veedor'
  return 'Invitado'
}

function getSupervisorDistrict(): string {
  const role = window.localStorage.getItem('authRole')
  if (role === 'distrito') return 'Distrito 01'
  if (role === 'admin') return 'Distrito 01'
  return ''
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
        <h1>Portal Electoral</h1>
        <p>Ingresa con tus credenciales de usuario</p>

        <form id="login-form" class="form-grid">
          <label for="user">Email</label>
          <input id="user" type="email" placeholder="usuario@electoral.test" required />

          <label for="pass">Contraseña</label>
          <input id="pass" type="password" placeholder="tu contraseña" required />

          <button class="cta" type="submit">Entrar</button>
          <button class="ghost-btn" data-go="/" type="button">Volver al inicio</button>
        </form>

        <!-- Ayuda para desar rollo -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0cce6; font-size: 13px; color: #888;">
          <p style="font-weight: 600; color: #666; margin-bottom: 8px;">💡 Credenciales de prueba:</p>
          <p>admin@electoral.test / Admin123456!</p>
          <p>supervisor.distrito@electoral.test / Supervisor123!</p>
          <p>supervisor.recinto@electoral.test / Supervisor123!</p>
          <p>veedor@electoral.test / Veedor123!</p>
        </div>
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
  
  // Si es colegio, usar colegioTemplate
  if (role === 'colegio') {
    return colegioTemplate()
  }

  // Para distrito y admin - template original
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Panel Interno</p>
          <h1>Centro de Carga</h1>
          <small>Sesion activa: ${getRoleLabel()}</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="mesas" type="button">Supervisión de Mesas</button>
          <button class="menu-link" data-view="veedores" type="button">Gestión de Veedores</button>
          <button class="menu-link" data-view="reportes" type="button">Reportes</button>
        </nav>

        <div class="status-box">
          <p>Tu Distrito</p>
          <strong>${getSupervisorDistrict()}</strong>
          <span>Mesas bajo tu supervisión</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title">Gestión de Mesas</h2>
          
          <!-- MENU MOBILE/RESPONSIVE -->
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            <button class="menu-tab is-active" data-view="mesas" type="button">Mesas</button>
            <button class="menu-tab" data-view="veedores" type="button">Delegados</button>
            <button class="menu-tab" data-view="reportes" type="button">Reportes</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- VIEW: MESAS -->
        <section id="view-mesas" class="view-root">
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
            <h3>Reportes de Votos - ${getSupervisorDistrict()}</h3>
            <p>Distribución de votos por partido en tu distrito</p>
            
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

      if (mesaEncontrada && userId) {
        // Insertar transmisión real en Supabase
        const { data: trans, error: transErr } = await supabase
          .from('transmisiones')
          .insert({
            mesa_id: mesaEncontrada.id,
            usuario_id: null, // se llenará cuando haya tabla usuarios vinculada
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

        console.log('[Supabase] Transmisión guardada correctamente')
      } else {
        // Sin sesión o mesa no encontrada: guardar localmente como respaldo
        console.warn('[Supabase] Guardando localmente (sin sesión o mesa no encontrada)')
        const mesasSubidas = JSON.parse(localStorage.getItem('mesasSubidas') || '[]')
        mesasSubidas.push({ id: Date.now(), mesaNumero, colegio: colegioValue, fecha: new Date().toLocaleDateString() })
        localStorage.setItem('mesasSubidas', JSON.stringify(mesasSubidas))
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
      window.localStorage.removeItem('authRole')
      navigate('/login')
    })
  }

  // Mesas subidas (para veedores)
  const mesasSubidasListTab = document.querySelector<HTMLElement>('#mesas-subidas-tab-list')

  const renderMesasSubidas = () => {
    const mesasSubidas = JSON.parse(localStorage.getItem('mesasSubidas') || '[]')
    const html = mesasSubidas.length === 0
      ? '<p class="empty">No has subido mesas aún</p>'
      : mesasSubidas
        .map(
          (mesa: any) => `<div class="mesa-item">
            <div class="mesa-info">
              <strong>${mesa.mesaNumero} - ${mesa.colegio}</strong>
              <span>${mesa.fecha}</span>
            </div>
            <button type="button" class="btn-solicitar-anulacion" data-id="${mesa.id}" style="background: #ff7f50; color: white;">
              Solicitar Anulación
            </button>
          </div>`
        )
        .join('')

    if (mesasSubidasListTab) mesasSubidasListTab.innerHTML = html

    // Handler para solicitar anulación con descripción
    document.querySelectorAll<HTMLButtonElement>('.btn-solicitar-anulacion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mesaId = btn.dataset.id
        const solicitudes = JSON.parse(localStorage.getItem('solicitudesAnulacion') || '[]')
        if (solicitudes.find((s: any) => s.mesaId === mesaId)) {
          alert('Ya existe una solicitud de anulación para esta mesa')
          return
        }

        // Crear modal para descripción
        const description = prompt('Ingresa la descripción de la solicitud de anulación:')
        if (description === null) return // Usuario canceló
        
        if (!description.trim()) {
          alert('La descripción no puede estar vacía')
          return
        }

        solicitudes.push({ mesaId, descripcion: description.trim(), fecha: new Date().toLocaleString(), estado: 'pendiente' })
        localStorage.setItem('solicitudesAnulacion', JSON.stringify(solicitudes))
        alert('Solicitud de anulación registrada')
        btn.disabled = true
        btn.textContent = 'Solicitado'
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

  // Mostrar/ocultar mensaje de error
  const showError = (message: string) => {
    let errorDiv = document.querySelector<HTMLDivElement>('#login-error')
    if (!errorDiv) {
      errorDiv = document.createElement('div')
      errorDiv.id = 'login-error'
      errorDiv.style.cssText = `
        background: #ffebee;
        border: 2px solid #c00;
        color: #c00;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-weight: 600;
        text-align: center;
      `
      form.parentElement?.insertBefore(errorDiv, form)
    }
    errorDiv.textContent = message
    errorDiv.style.display = 'block'
  }

  const hideError = () => {
    const errorDiv = document.querySelector<HTMLDivElement>('#login-error')
    if (errorDiv) errorDiv.style.display = 'none'
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const userField = document.querySelector<HTMLInputElement>('#user')
    const passField = document.querySelector<HTMLInputElement>('#pass')
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')

    const email = userField?.value?.trim() ?? ''
    const password = passField?.value ?? ''

    // Validación de campos vacíos
    if (!email || !password) {
      showError('❌ Email y contraseña son requeridos')
      return
    }

    // Desactivar botón mientras se procesa
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Validando...'
    }

    hideError()

    try {
      // 1️⃣ Autenticación con Supabase Auth (OBLIGATORIA)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        // Errores específicos de autenticación
        if (authError.message.includes('Invalid login credentials')) {
          showError('❌ Email o contraseña incorrectos')
        } else if (authError.message.includes('Email not confirmed')) {
          showError('❌ Email no confirmado. Revisa tu bandeja de entrada.')
        } else {
          showError(`❌ Error de autenticación: ${authError.message}`)
        }
        console.error('[Supabase Auth] Error:', authError)
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Entrar'
        }
        return
      }

      if (!authData.user) {
        showError('❌ Usuario no encontrado')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Entrar'
        }
        return
      }

      // 2️⃣ Obtener rol del usuario desde tabla usuarios (VALIDACIÓN ADICIONAL)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol, activo')
        .eq('auth_id', authData.user.id)
        .eq('activo', true)
        .single()

      if (userError || !userData) {
        showError('❌ Usuario no está registrado en el sistema o está desactivado')
        console.error('[Usuarios] Error:', userError)
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Entrar'
        }
        return
      }

      // 3️⃣ Login exitoso - guardar sesión
      const rol = userData.rol as RoleId
      window.localStorage.setItem('authRole', rol)

      console.log(`✅ [Login] Usuario autenticado: ${email} (${rol})`)

      // Navegar según el rol
      if (rol === 'veedor') {
        navigate('/')
      } else {
        navigate('/panel')
      }
    } catch (err) {
      showError('❌ Error inesperado. Intenta de nuevo.')
      console.error('[Login] Error:', err)
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Entrar'
      }
    }
  })
}

function bindPanel() {
  // View navigation
  const viewMesas = document.querySelector<HTMLElement>('#view-mesas')
  const viewVeedores = document.querySelector<HTMLElement>('#view-veedores')
  const viewReportes = document.querySelector<HTMLElement>('#view-reportes')
  const viewTitle = document.querySelector<HTMLElement>('#view-title')
  const menuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = document.querySelectorAll<HTMLButtonElement>('.menu-tab')

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
    window.localStorage.removeItem('authRole')
    navigate('/')
  })

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
              const statusClass = mesa.estado === 'abierta' ? 'mesa-abierta' : 'mesa-cerrada'
              const statusText = mesa.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'
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
      .select('id, nombre, apellido, email, rol, recintos(nombre)')
      .eq('rol', 'veedor')
      .eq('activo', true)

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
          .select('id, nombre, apellido, email, rol, recintos!inner(nombre, distrito_id)')
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
      veedoresList.innerHTML = '<p class="empty">No hay delegados registrados</p>'
      return
    }

    veedoresList.innerHTML = usuariosData
      .map((v: any) => `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${v.nombre} ${v.apellido}</strong>
            <span>${v.email}</span>
            <small style="color:#888;display:block">${(v.recintos as any)?.nombre ?? 'Sin recinto asignado'}</small>
          </div>
          <button type="button" class="btn-delete-veedor" data-id="${v.id}" style="background:#dc3545;color:white">Desactivar</button>
        </div>`)
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

  // Cargar datos al entrar a la sección de reportes
  loadChartData('alcalde')

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
    })
    // Mesa actualizada → actualizar badge de estado en la lista visible
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mesas' }, (payload) => {
      loadChartData(getActiveCargo())
      const mesaId = (payload.new as any)?.id
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
          const nuevoEstado = (payload.new as any)?.estado as string
          if (statusSpan) statusSpan.textContent = estadoMap[nuevoEstado] ?? nuevoEstado
        }
      }
    })
    // Nueva incidencia → refrescar gráfico
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidencias' }, () => {
      loadChartData(getActiveCargo())
    })
    .subscribe((status) => {
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
      window.localStorage.removeItem('authRole')
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
          const statusClass = mesa.estado === 'abierta' ? 'mesa-abierta' : 'mesa-cerrada'
          const statusText = mesa.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'
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
    if (role === 'colegio') {
      bindColegio()
    } else {
      bindPanel()
    }
  }
}

window.addEventListener('popstate', renderRoute)

// Arrancar: sincronizar sesión de Supabase → luego cargar catálogos → renderizar
;(async () => {
  // Restaurar sesión activa de Supabase (persiste entre recargas)
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session?.user) {
    // Si hay sesión activa y no tenemos el rol en localStorage, recuperarlo de la BD
    const storedRole = window.localStorage.getItem('authRole')
    if (!storedRole) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('auth_id', sessionData.session.user.id)
        .single()
      if (userData?.rol) window.localStorage.setItem('authRole', userData.rol)
    }
  }

  await loadCatalogos()
  renderRoute()
})()
