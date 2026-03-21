import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor #app')
}

const rootApp = app

type RouteId = 'home' | 'login' | 'panel'
type RoleId = 'veedor' | 'distrito' | 'colegio' | 'admin'

const colegiosMock = [
  { nombre: 'Colegio Central', distrito: 'Distrito 01' },
  { nombre: 'Colegio Las Palmas', distrito: 'Distrito 03' },
  { nombre: 'Colegio San Martin', distrito: 'Distrito 02' },
]

const partidos = [
  { id: 1, nombre: 'Frente Progresista', sigla: 'FP', color: '#e6008e' },
  { id: 2, nombre: 'Alianza Democrática', sigla: 'AD', color: '#00b4d8' },
  { id: 3, nombre: 'Movimiento Ciudadano', sigla: 'MC', color: '#ffc300' },
]

const cargos = [
  { id: 1, nombre: 'Alcalde' },
  { id: 2, nombre: 'Concejal' },
]

const candidatos = [
  { id: 1, nombre: 'Juan Pérez', partido_id: 1, cargo_id: 1 },
  { id: 2, nombre: 'María López', partido_id: 2, cargo_id: 1 },
  { id: 3, nombre: 'Carlos García', partido_id: 3, cargo_id: 1 },
  { id: 4, nombre: 'Ana Ruiz', partido_id: 1, cargo_id: 2 },
  { id: 5, nombre: 'Roberto Silva', partido_id: 2, cargo_id: 2 },
  { id: 6, nombre: 'Isabel Martín', partido_id: 3, cargo_id: 2 },
]

const mesas = [
  { id: 1, numero: 'M001', colegio: 'Colegio Central', distrito: 'Distrito 01', estado: 'abierta' },
  { id: 2, numero: 'M002', colegio: 'Colegio Central', distrito: 'Distrito 01', estado: 'cerrada' },
  { id: 3, numero: 'M003', colegio: 'Colegio Central', distrito: 'Distrito 01', estado: 'abierta' },
  { id: 4, numero: 'M001', colegio: 'Colegio Las Palmas', distrito: 'Distrito 03', estado: 'abierta' },
  { id: 5, numero: 'M002', colegio: 'Colegio Las Palmas', distrito: 'Distrito 03', estado: 'abierta' },
  { id: 6, numero: 'M001', colegio: 'Colegio San Martin', distrito: 'Distrito 02', estado: 'cerrada' },
]

// Initialize sample data for demo
function initializeSampleData() {
  // Only initialize if there's no data yet (first time)
  const existing = localStorage.getItem('mesasSubidas')
  if (existing && JSON.parse(existing).length > 0) return

  // Sample mesas subidas (what veedores upload)
  const sampleMesas = [
    { id: Date.now() - 10000, mesaNumero: 'M001', colegio: 'Colegio Central', fecha: '21/03/2026' },
    { id: Date.now() - 9000, mesaNumero: 'M002', colegio: 'Colegio Central', fecha: '21/03/2026' },
    { id: Date.now() - 8000, mesaNumero: 'M003', colegio: 'Colegio Central', fecha: '21/03/2026' },
    { id: Date.now() - 7000, mesaNumero: 'M001', colegio: 'Colegio Las Palmas', fecha: '21/03/2026' },
    { id: Date.now() - 6000, mesaNumero: 'M002', colegio: 'Colegio Las Palmas', fecha: '21/03/2026' },
    { id: Date.now() - 5000, mesaNumero: 'M001', colegio: 'Colegio San Martin', fecha: '21/03/2026' },
  ]

  // Sample solicitudes (what veedores request annulment for)
  const sampleSolicitudes = [
    { mesaId: sampleMesas[0].id, descripcion: 'Acta ilegible, falta la firma de los árbitros', fecha: '21/03/2026 14:30', estado: 'pendiente' },
    { mesaId: sampleMesas[1].id, descripcion: 'Problemas en el conteo de votos, posible error numérico', fecha: '21/03/2026 14:45', estado: 'pendiente' },
    { mesaId: sampleMesas[3].id, descripcion: 'Mesa completamente vacía en los registros', fecha: '21/03/2026 15:00', estado: 'pendiente' },
    { mesaId: sampleMesas[4].id, descripcion: 'Inconsistencia entre númerador y acta digital', fecha: '21/03/2026 15:15', estado: 'pendiente' },
  ]

  localStorage.setItem('mesasSubidas', JSON.stringify(sampleMesas))
  localStorage.setItem('solicitudesAnulacion', JSON.stringify(sampleSolicitudes))
}

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

function isLoggedIn() {
  const role = window.localStorage.getItem('authRole')
  return role === 'veedor' || role === 'admin' || role === 'distrito' || role === 'colegio'
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
              <button type="button" class="selection-btn" data-selection="manual">🔍 Buscar por distrito </button>
            </div>

            <div id="selection-search" class="selection-panel">
              <div class="search-input-wrapper">
                <input id="colegio-search" type="search" placeholder="Escribe el nombre de tu colegio..." />
                <button type="button" id="colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos los colegios">▼</button>
              </div>
              <ul id="colegio-results" class="search-list"></ul>
            </div>

            <div id="selection-manual" class="selection-panel">
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
              <label>Foto del acta</label>
              <div class="foto-controls">
                <button type="button" class="cta-secondary" id="btn-camera">📷 Abrir cámara</button>
                <button type="button" class="cta-secondary" id="btn-gallery">🖼️ Seleccionar de galería</button>
              </div>
              <input id="public-foto-gallery" type="file" accept="image/*" style="display: none;" />
              
              <!-- Camera Modal -->
              <div id="camera-modal" class="modal" style="display: none;">
                <div class="modal-content">
                  <div class="modal-header">
                    <h3>Capturar Foto</h3>
                    <button type="button" class="modal-close" id="btn-close-camera">✕</button>
                  </div>
                  <div class="modal-body">
                    <video id="camera-video" playsinline autoplay muted style="width: 100%; max-width: 100%; border-radius: 8px; background: #1a0f1a;"></video>
                    <canvas id="camera-canvas" style="display: none;"></canvas>
                    <div class="camera-controls" style="margin-top: 16px; display: flex; gap: 12px; justify-content: center;">
                      <button type="button" class="cta-large" id="btn-capture-photo">📸 Capturar</button>
                      <button type="button" class="cta-secondary" id="btn-cancel-camera">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div id="foto-preview" style="margin-top: 16px; text-align: center; display: none;">
                <img id="preview-img" src="" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 2px solid #E6008E;" />
                <p id="foto-status" style="margin-top: 8px; color: #00FF51; font-weight: 600;">✓ Foto capturada</p>
              </div>
              <input id="public-foto" type="hidden" required />
            </div>

            <div>
              <label>Cargo a reportar</label>
              <div class="cargo-tabs" id="cargo-tabs">
                ${cargos.map((c, idx) => `<button class="cargo-tab ${idx === 0 ? 'is-active' : ''}" type="button" data-cargo="${c.id}">${c.nombre}</button>`).join('')}
              </div>
            </div>

            <div id="candidatos-grid" class="candidatos-grid"></div>

            <button class="cta-large" type="submit" id="submit-btn" disabled>Guardar en borrador local</button>
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
          <label for="role">Rol</label>
          <select id="role" name="role">
            <option value="veedor">Veedor</option>
            <option value="distrito">Supervisor de Distrito</option>
            <option value="colegio">Responsable de Colegio</option>
            <option value="admin">Administrador</option>
          </select>

          <label for="user">Usuario</label>
          <input id="user" type="text" placeholder="usuario" required />

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
  
  // Si es colegio, usar colegioTemplate
  if (role === 'colegio') {
    return colegioTemplate()
  }

  // Para distrito y admin - template con opciones diferenciadas
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Panel Interno</p>
          <h1>Centro de Carga</h1>
          <small>Sesion activa: ${getRoleLabel()}</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          ${isAdmin ? `
            <button class="menu-link is-active" data-view="reportes" type="button">Reportes Generales</button>
            <button class="menu-link" data-view="usuarios" type="button">Gestión de Usuarios</button>
            <button class="menu-link" data-view="veedores" type="button">Gestión de Delegados</button>
          ` : `
            <button class="menu-link is-active" data-view="mesas" type="button">Supervisión de Mesas</button>
            <button class="menu-link" data-view="veedores" type="button">Gestión de Veedores</button>
            <button class="menu-link" data-view="reportes" type="button">Reportes</button>
          `}
        </nav>

        <div class="status-box">
          <p>${isAdmin ? 'Todos los Distritos' : 'Tu Distrito'}</p>
          <strong>${getSupervisorDistrict()}</strong>
          <span>${isAdmin ? 'Vista administrativa' : 'Mesas bajo tu supervisión'}</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <h2 id="view-title">${isAdmin ? 'Reportes Generales' : 'Gestión de Mesas'}</h2>
          
          <!-- MENU MOBILE/RESPONSIVE -->
          <nav class="menu-horizontal" aria-label="Navegación de vistas">
            ${isAdmin ? `
              <button class="menu-tab is-active" data-view="reportes" type="button">Reportes</button>
              <button class="menu-tab" data-view="usuarios" type="button">Usuarios</button>
              <button class="menu-tab" data-view="veedores" type="button">Delegados</button>
            ` : `
              <button class="menu-tab is-active" data-view="mesas" type="button">Mesas</button>
              <button class="menu-tab" data-view="veedores" type="button">Veedores</button>
              <button class="menu-tab" data-view="reportes" type="button">Reportes</button>
            `}
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        ${isAdmin ? `
          <!-- ADMIN VIEWS -->
          
          <!-- VIEW: REPORTES (ADMIN - Todos los distritos) -->
          <section id="view-reportes" class="view-root is-active">
            <article class="card">
              <h3>Reportes de Votos - Consolidado</h3>
              <p>Distribución de votos por partido en todos los distritos</p>
              
              <div style="margin-top: 16px;">
                <label>Selecciona un Colegio</label>
                <div class="search-input-wrapper">
                  <input id="admin-colegio-search" type="search" placeholder="Busca un colegio..." />
                  <button type="button" id="admin-colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos">▼</button>
                </div>
                <ul id="admin-colegio-results" class="search-list"></ul>
              </div>
              
              <div class="charts-container" style="margin-top: 24px;">
                <!-- Pie Chart -->
                <div class="chart-wrapper">
                  <svg id="pie-chart" width="280" height="280" viewBox="0 0 280 280"></svg>
                </div>
                
                <!-- Legend -->
                <div id="chart-legend" class="chart-legend"></div>
              </div>
            </article>
          </section>

          <!-- VIEW: GESTIÓN DE USUARIOS DE DISTRITO -->
          <section id="view-usuarios" class="view-root" style="display: none;">
            <article class="card">
              <h3>Crear Usuario de Distrito</h3>
              <p>Registra nuevos supervisores de distrito</p>
              
              <div style="margin-top: 12px;">
                <label for="new-user-distrito">Distrito</label>
                <select id="new-user-distrito">
                  <option value="">Selecciona un distrito</option>
                  <option value="Distrito 01">Distrito 01</option>
                  <option value="Distrito 02">Distrito 02</option>
                  <option value="Distrito 03">Distrito 03</option>
                </select>
                
                <label for="new-user-username" style="margin-top: 12px;">Usuario</label>
                <input id="new-user-username" type="text" placeholder="Ej: supervisor01" />
                
                <label for="new-user-password" style="margin-top: 12px;">Contraseña</label>
                <input id="new-user-password" type="password" placeholder="Ingresa contraseña" />
                
                <button type="button" class="cta" id="btn-crear-usuario-distrito" style="margin-top: 16px;">Crear Usuario</button>
              </div>
            </article>

            <article class="card">
              <h3>Usuarios de Distrito Registrados</h3>
              <div id="usuarios-distrito-list" class="veedores-list"></div>
            </article>
          </section>

          <!-- VIEW: GESTIÓN DE DELEGADOS -->
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

        ` : `
          <!-- DISTRITO VIEWS -->
          
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

          <!-- VIEW: VEEDORES (DISTRITO) -->
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

          <!-- VIEW: REPORTES (DISTRITO) -->
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
        `}
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
  
  // Store vote counts per cargo: { cargoId: totalVotes }
  const cargoVotes: Record<number, number> = {}

  const renderCandidatos = (cargoId: number) => {
    if (!candidatosGrid) return
    
    // Save votes from previous cargo
    const prevInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
    if (prevInputs.length > 0) {
      const activeTab = document.querySelector<HTMLElement>('.cargo-tab.is-active')
      if (activeTab) {
        const prevCargoId = parseInt(activeTab.dataset.cargo as string)
        const total = Array.from(prevInputs).reduce((sum, input) => {
          return sum + (parseInt(input.value) || 0)
        }, 0)
        cargoVotes[prevCargoId] = total
      }
    }

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

    const blankVotesHtml = `
      <div style="border-top: 2px solid #f0cce6; padding-top: 16px; margin-top: 16px;">
        <label class="candidato-item">
          <input type="number" min="0" value="0" data-tipo="nulos" />
          <span>Votos Nulos</span>
          <span class="partido-badge" style="background-color: #999999; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">NULOS</span>
        </label>
        <label class="candidato-item">
          <input type="number" min="0" value="0" data-tipo="blancos" />
          <span>Votos en Blanco</span>
          <span class="partido-badge" style="background-color: #cccccc; color: #333; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">BLANCOS</span>
        </label>
      </div>
    `

    candidatosGrid.innerHTML = `<div class="candidatos-list">${candidatosHtml}${blankVotesHtml}</div>`
    
    // Add event listeners to vote inputs
    const allInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
    allInputs.forEach((input) => {
      input.addEventListener('input', validateAllCargos)
    })
  }

  // Validation function: check if all cargos have at least one vote
  const validateAllCargos = () => {
    const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')
    if (!submitBtn) return

    // Save current cargo votes
    const activeTab = document.querySelector<HTMLElement>('.cargo-tab.is-active')
    if (activeTab) {
      const currentCargoId = parseInt(activeTab.dataset.cargo as string)
      const currentInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
      const currentTotal = Array.from(currentInputs).reduce((sum, input) => {
        return sum + (parseInt(input.value) || 0)
      }, 0)
      cargoVotes[currentCargoId] = currentTotal
    }

    // Check if all cargos have at least 1 vote
    let allCargosFilled = true
    for (const cargo of cargos) {
      if ((cargoVotes[cargo.id] || 0) === 0) {
        allCargosFilled = false
        break
      }
    }

    // Enable/disable submit button
    submitBtn.disabled = !allCargosFilled
  }

  cargoTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      cargoTabs.forEach((t) => t.classList.remove('is-active'))
      tab.classList.add('is-active')
      const cargoId = parseInt(tab.dataset.cargo as string)
      renderCandidatos(cargoId)
      validateAllCargos() // Revalidate after switching cargo tabs
    })
  })

  // Initial render for first cargo (but only when data section is visible)
  if (cargoTabs.length > 0) {
    const firstTab = cargoTabs[0]
    const cargoId = parseInt(firstTab.dataset.cargo as string)
    renderCandidatos(cargoId)
    validateAllCargos() // Initial validation
  }

  // Form submission
  const form = document.querySelector<HTMLFormElement>('#manual-form')
  const successFieldset = document.querySelector<HTMLElement>('#success-fieldset')

  // Photo capture handling
  const btnCamera = document.querySelector<HTMLButtonElement>('#btn-camera')
  const btnGallery = document.querySelector<HTMLButtonElement>('#btn-gallery')
  const fotoGalleryInput = document.querySelector<HTMLInputElement>('#public-foto-gallery')
  const fotoHiddenInput = document.querySelector<HTMLInputElement>('#public-foto')
  const fotoPreview = document.querySelector<HTMLElement>('#foto-preview')
  const previewImg = document.querySelector<HTMLImageElement>('#preview-img')

  // Gallery input handling
  const handleFotoSelection = (input: HTMLInputElement) => {
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && previewImg && fotoPreview) {
        const reader = new FileReader()
        reader.onload = (event) => {
          previewImg.src = event.target?.result as string
          fotoPreview.style.display = 'block'
          if (fotoHiddenInput) {
            fotoHiddenInput.value = event.target?.result as string
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  if (fotoGalleryInput) {
    handleFotoSelection(fotoGalleryInput)
  }

  if (btnGallery && fotoGalleryInput) {
    btnGallery.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault()
      fotoGalleryInput.click()
    })
  }

  // Camera modal handling with WebRTC
  const cameraModal = document.querySelector<HTMLElement>('#camera-modal')
  const cameraVideo = document.querySelector<HTMLVideoElement>('#camera-video')
  const cameraCanvas = document.querySelector<HTMLCanvasElement>('#camera-canvas')
  const btnCloseCamera = document.querySelector<HTMLButtonElement>('#btn-close-camera')
  const btnCancelCamera = document.querySelector<HTMLButtonElement>('#btn-cancel-camera')
  const btnCapturePhoto = document.querySelector<HTMLButtonElement>('#btn-capture-photo')

  let cameraStream: MediaStream | null = null

  const startCamera = async () => {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (cameraVideo && cameraStream) {
        cameraVideo.srcObject = cameraStream
        if (cameraModal) cameraModal.style.display = 'flex'
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      cameraStream = null
    }
    if (cameraModal) cameraModal.style.display = 'none'
  }

  const capturePhoto = () => {
    if (cameraVideo && cameraCanvas && previewImg && fotoPreview) {
      const ctx = cameraCanvas.getContext('2d')
      cameraCanvas.width = cameraVideo.videoWidth
      cameraCanvas.height = cameraVideo.videoHeight
      if (ctx) {
        ctx.drawImage(cameraVideo, 0, 0)
        const photoData = cameraCanvas.toDataURL('image/jpeg')
        previewImg.src = photoData
        fotoPreview.style.display = 'block'
        if (fotoHiddenInput) {
          fotoHiddenInput.value = photoData
        }
        stopCamera()
      }
    }
  }

  if (btnCamera) {
    btnCamera.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault()
      startCamera()
    })
  }

  if (btnCapturePhoto) {
    btnCapturePhoto.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault()
      capturePhoto()
    })
  }

  if (btnCloseCamera || btnCancelCamera) {
    const closeHandler = () => {
      stopCamera()
    }
    if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeHandler)
    if (btnCancelCamera) btnCancelCamera.addEventListener('click', closeHandler)
  }

  // Close camera modal when clicking outside
  if (cameraModal) {
    cameraModal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === cameraModal) {
        stopCamera()
      }
    })
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault()

      // Guardar mesa subida
      const mesaNumero = document.querySelector<HTMLInputElement>('#public-mesa')?.value || 'Sin número'
      const colegioValue = selectedLocationSpan?.textContent || 'Colegio desconocido'
      const mesasSubidas = JSON.parse(localStorage.getItem('mesasSubidas') || '[]')
      mesasSubidas.push({
        id: Date.now(),
        mesaNumero,
        colegio: colegioValue,
        fecha: new Date().toLocaleDateString(),
      })
      localStorage.setItem('mesasSubidas', JSON.stringify(mesasSubidas))

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
    btnLogoutPublic.addEventListener('click', () => {
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

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const roleField = document.querySelector<HTMLSelectElement>('#role')
    const role = (roleField?.value ?? 'veedor') as RoleId
    window.localStorage.setItem('authRole', role)
    if (role === 'veedor') {
      navigate('/')
    } else {
      navigate('/panel')
    }
  })
}

function bindPanel() {
  const role = window.localStorage.getItem('authRole')
  const isAdmin = role === 'admin'

  // View navigation
  const viewMesas = document.querySelector<HTMLElement>('#view-mesas')
  const viewVeedores = document.querySelector<HTMLElement>('#view-veedores')
  const viewReportes = document.querySelector<HTMLElement>('#view-reportes')
  const viewUsuarios = document.querySelector<HTMLElement>('#view-usuarios')
  const viewTitle = document.querySelector<HTMLElement>('#view-title')
  const menuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link')
  const menuTabs = document.querySelectorAll<HTMLButtonElement>('.menu-tab')

  const showView = (viewName: string) => {
    if (viewMesas) viewMesas.style.display = 'none'
    if (viewVeedores) viewVeedores.style.display = 'none'
    if (viewReportes) viewReportes.style.display = 'none'
    if (viewUsuarios) viewUsuarios.style.display = 'none'

    menuLinks.forEach((btn) => btn.classList.remove('is-active'))
    menuTabs.forEach((btn) => btn.classList.remove('is-active'))

    switch (viewName) {
      case 'mesas':
        if (viewMesas) viewMesas.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Gestión de Mesas'
        break
      case 'veedores':
        if (viewVeedores) viewVeedores.style.display = 'block'
        if (viewTitle) viewTitle.textContent = isAdmin ? 'Gestión de Delegados' : 'Gestión de Veedores'
        break
      case 'reportes':
        if (viewReportes) viewReportes.style.display = 'block'
        if (viewTitle) viewTitle.textContent = isAdmin ? 'Reportes Generales' : 'Reportes'
        break
      case 'usuarios':
        if (viewUsuarios) viewUsuarios.style.display = 'block'
        if (viewTitle) viewTitle.textContent = 'Gestión de Usuarios de Distrito'
        renderDistrictUsers()
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
      const view = btn.dataset.view || (isAdmin ? 'reportes' : 'mesas')
      showView(view)
    })
  })

  menuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view || (isAdmin ? 'reportes' : 'mesas')
      showView(view)
    })
  })

  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-btn')
  if (!logoutButton) return

  logoutButton.addEventListener('click', () => {
    window.localStorage.removeItem('authRole')
    navigate('/')
  })

  // GESTIÓN DE USUARIOS DE DISTRITO (ADMIN ONLY)
  const btnCrearUsuarioDistrito = document.querySelector<HTMLButtonElement>('#btn-crear-usuario-distrito')
  const newUserDistrito = document.querySelector<HTMLSelectElement>('#new-user-distrito')
  const newUserUsername = document.querySelector<HTMLInputElement>('#new-user-username')
  const newUserPassword = document.querySelector<HTMLInputElement>('#new-user-password')
  const usuariosDistritoList = document.querySelector<HTMLElement>('#usuarios-distrito-list')

  const renderDistrictUsers = () => {
    if (!usuariosDistritoList) return
    const users = JSON.parse(localStorage.getItem('usuariosDistrito') || '[]')
    
    if (users.length === 0) {
      usuariosDistritoList.innerHTML = '<p class="empty">No hay usuarios de distrito registrados</p>'
      return
    }

    usuariosDistritoList.innerHTML = users
      .map(
        (user: any, idx: number) => `
        <div class="veedor-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #f0cce6; border-radius: 8px; margin-bottom: 8px;">
          <div>
            <strong>${user.usuario}</strong>
            <span style="display: block; font-size: 12px; color: #6b3f67;">${user.distrito}</span>
          </div>
          <button type="button" class="btn-delete-veedor" data-idx="${idx}">Eliminar</button>
        </div>
      `
      )
      .join('')

    // Delete handlers
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-veedor').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx || '0')
        users.splice(idx, 1)
        localStorage.setItem('usuariosDistrito', JSON.stringify(users))
        renderDistrictUsers()
      })
    })
  }

  if (btnCrearUsuarioDistrito) {
    btnCrearUsuarioDistrito.addEventListener('click', () => {
      const distrito = newUserDistrito?.value
      const usuario = newUserUsername?.value?.trim()
      const password = newUserPassword?.value?.trim()

      if (!distrito || !usuario || !password) {
        alert('Completa todos los campos')
        return
      }

      const users = JSON.parse(localStorage.getItem('usuariosDistrito') || '[]')
      if (users.find((u: any) => u.usuario === usuario)) {
        alert('Este usuario ya existe')
        return
      }

      users.push({ distrito, usuario, password })
      localStorage.setItem('usuariosDistrito', JSON.stringify(users))
      
      if (newUserDistrito) newUserDistrito.value = ''
      if (newUserUsername) newUserUsername.value = ''
      if (newUserPassword) newUserPassword.value = ''
      
      alert('Usuario creado exitosamente')
      renderDistrictUsers()
    })
  }

  if (isAdmin) {
    renderDistrictUsers()
  }

  // REPORTES CON SELECTOR DE COLEGIO (ADMIN)
  if (isAdmin) {
    const adminColegioSearch = document.querySelector<HTMLInputElement>('#admin-colegio-search')
    const adminColegioResults = document.querySelector<HTMLUListElement>('#admin-colegio-results')
    const btnAdminDropdown = document.querySelector<HTMLButtonElement>('#admin-colegio-search-dropdown')

    let selectedAdminColegio = ''

    if (adminColegioSearch && adminColegioResults) {
      adminColegioSearch.addEventListener('input', (event) => {
        const value = (event.target as HTMLInputElement).value.trim().toLowerCase()
        if (!value) {
          adminColegioResults.innerHTML = ''
          return
        }

        const filtered = colegiosMock.filter((c) => c.nombre.toLowerCase().includes(value))
        adminColegioResults.innerHTML = filtered.length
          ? filtered.map((c) => `<li data-colegio="${c.nombre}" data-distrito="${c.distrito}"><strong>${c.nombre}</strong><span>${c.distrito}</span></li>`).join('')
          : '<li class="empty">Sin resultados</li>'
      })

      adminColegioResults.addEventListener('click', (e) => {
        const li = (e.target as HTMLElement).closest('li')
        if (li && !li.classList.contains('empty')) {
          selectedAdminColegio = li.dataset.colegio || ''
          if (adminColegioSearch) adminColegioSearch.value = selectedAdminColegio
          adminColegioResults.innerHTML = ''
          renderAdminChart(selectedAdminColegio)
        }
      })

      if (btnAdminDropdown) {
        btnAdminDropdown.addEventListener('click', () => {
          if (adminColegioResults.innerHTML !== '') {
            adminColegioResults.innerHTML = ''
          } else {
            const sorted = [...colegiosMock].sort((a, b) => a.nombre.localeCompare(b.nombre))
            adminColegioResults.innerHTML = sorted
              .map((c) => `<li data-colegio="${c.nombre}" data-distrito="${c.distrito}"><strong>${c.nombre}</strong><span>${c.distrito}</span></li>`)
              .join('')
            adminColegioSearch?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })
      }

      // Close dropdown on click outside or Escape
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (!adminColegioSearch?.contains(target) && !btnAdminDropdown?.contains(target) && adminColegioResults.innerHTML !== '') {
          adminColegioResults.innerHTML = ''
        }
      })

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && adminColegioResults.innerHTML !== '') {
          adminColegioResults.innerHTML = ''
        }
      })
    }

    // Render consolidated chart (all districts)
    const renderAdminChart = (colegioFilter?: string) => {
      const pieChartSvg = document.querySelector<SVGElement>('#pie-chart')
      const chartLegend = document.querySelector<HTMLElement>('#chart-legend')

      if (!pieChartSvg || !chartLegend) return

      chartLegend.innerHTML = ''
      pieChartSvg.innerHTML = ''

      // Use mock data - in real app, aggregate data from mesasSubidas
      const votosData: Record<number, number> = colegioFilter
        ? { 1: 285, 2: 310, 3: 205 } // Specific colegio votes
        : { 1: 1310, 2: 1290, 3: 820 } // All districts consolidated

      const total = Object.values(votosData).reduce((a, b) => a + b, 0)

      let angle = 0
      let innerHTML = ''
      const colors = ['#e6008e', '#00b4d8', '#ffc300']
      const labels = ['Frente Progresista', 'Alianza Democrática', 'Movimiento Ciudadano']

      partidos.forEach((partido, idx) => {
        const votes = votosData[partido.id] || 0
        const percentage = (votes / total) * 100
        const sliceAngle = (percentage / 100) * 360

        const startAngle = (angle * Math.PI) / 180
        const endAngle = ((angle + sliceAngle) * Math.PI) / 180
        const x1 = 140 + 120 * Math.cos(startAngle - Math.PI / 2)
        const y1 = 140 + 120 * Math.sin(startAngle - Math.PI / 2)
        const x2 = 140 + 120 * Math.cos(endAngle - Math.PI / 2)
        const y2 = 140 + 120 * Math.sin(endAngle - Math.PI / 2)
        const largeArc = sliceAngle > 180 ? 1 : 0

        const path = `M 140 140 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`
        innerHTML += `<path d="${path}" fill="${colors[idx]}" stroke="white" stroke-width="2"/>`

        chartLegend.innerHTML += `<div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px; background: ${colors[idx]}; border-radius: 3px;"></div>
          <div>
            <strong style="font-size: 14px; color: #2d1630;">${labels[idx]}</strong>
            <span style="font-size: 12px; color: #6b3f67; display: block;">${votes} votos (${percentage.toFixed(1)}%)</span>
          </div>
        </div>`

        angle += sliceAngle
      })

      pieChartSvg.innerHTML = innerHTML
    }

    // Initial chart rendering
    renderAdminChart()
  } else {
    // REPORTES PARA DISTRITO
    const supervisorDistrict = getSupervisorDistrict()
    const pieChartSvg = document.querySelector<SVGElement>('#pie-chart')
    const chartLegend = document.querySelector<HTMLElement>('#chart-legend')

    if (pieChartSvg && chartLegend) {
      const votosDistritos: Record<string, Record<number, number>> = {
        'Distrito 01': {
          1: 450,
          2: 380,
          3: 270,
        },
        'Distrito 02': {
          1: 520,
          2: 410,
          3: 190,
        },
        'Distrito 03': {
          1: 340,
          2: 500,
          3: 360,
        },
      }

      const districtVotes = votosDistritos[supervisorDistrict] || { 1: 100, 2: 100, 3: 100 }
      const total = Object.values(districtVotes).reduce((a, b) => a + b, 0)

      let angle = 0
      let innerHTML = ''
      const colors = ['#e6008e', '#00b4d8', '#ffc300']
      const labels = ['Frente Progresista', 'Alianza Democrática', 'Movimiento Ciudadano']

      partidos.forEach((partido, idx) => {
        const votes = districtVotes[partido.id] || 0
        const percentage = (votes / total) * 100
        const sliceAngle = (percentage / 100) * 360

        const startAngle = (angle * Math.PI) / 180
        const endAngle = ((angle + sliceAngle) * Math.PI) / 180
        const x1 = 140 + 120 * Math.cos(startAngle - Math.PI / 2)
        const y1 = 140 + 120 * Math.sin(startAngle - Math.PI / 2)
        const x2 = 140 + 120 * Math.cos(endAngle - Math.PI / 2)
        const y2 = 140 + 120 * Math.sin(endAngle - Math.PI / 2)
        const largeArc = sliceAngle > 180 ? 1 : 0

        const path = `M 140 140 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`

        innerHTML += `<path d="${path}" fill="${colors[idx]}" stroke="white" stroke-width="2"/>`

        // Legend
        chartLegend.innerHTML += `<div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px; background: ${colors[idx]}; border-radius: 3px;"></div>
          <div>
            <strong style="font-size: 14px; color: #2d1630;">${labels[idx]}</strong>
            <span style="font-size: 12px; color: #6b3f67; display: block;">${votes} votos (${percentage.toFixed(1)}%)</span>
          </div>
        </div>`

        angle += sliceAngle
      })

      pieChartSvg.innerHTML = innerHTML
    }
  }

  // Supervisor college search (DISTRITO ONLY)
  if (!isAdmin) {
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
  }

  // Veedores management (works for both admin and distrito)
  const supervisorDistrict = getSupervisorDistrict()
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

      const colegios = isAdmin
        ? colegiosMock.filter((c) => c.nombre.toLowerCase().includes(value))
        : colegiosMock.filter((c) => c.nombre.toLowerCase().includes(value) && c.distrito === supervisorDistrict)

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
          const colegiosDistrict = isAdmin
            ? [...colegiosMock].sort((a, b) => a.nombre.localeCompare(b.nombre))
            : colegiosMock
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

  let veedores: Array<{ id: number; usuario: string; password: string; colegio: string }> = JSON.parse(
    localStorage.getItem('veedores') || '[]'
  )

  const renderVeedores = () => {
    if (!veedoresList) return
    if (veedores.length === 0) {
      veedoresList.innerHTML = '<p class="empty">No hay delegados registrados</p>'
      return
    }

    veedoresList.innerHTML = veedores
      .map(
        (veedor) => `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${veedor.usuario}</strong>
            <span>${veedor.colegio}</span>
          </div>
          <button type="button" class="btn-delete-veedor" data-id="${veedor.id}">Eliminar</button>
        </div>`
      )
      .join('')

    // Add delete event listeners
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-veedor').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id as string)
        veedores = veedores.filter((v) => v.id !== id)
        localStorage.setItem('veedores', JSON.stringify(veedores))
        renderVeedores()
      })
    })
  }

  if (btnAgregarVeedor) {
    btnAgregarVeedor.addEventListener('click', () => {
      const usuario = veedorUsuarioInput?.value || ''
      const password = veedorPasswordInput?.value || ''

      if (!selectedVeedorColegio || !usuario || !password) {
        alert('Por favor completa todos los campos')
        return
      }

      // Check if usuario already exists
      if (veedores.some((v) => v.usuario === usuario)) {
        alert('Este usuario ya existe')
        return
      }

      const newVeedor = {
        id: Date.now(),
        usuario,
        password,
        colegio: selectedVeedorColegio,
      }

      veedores.push(newVeedor)
      localStorage.setItem('veedores', JSON.stringify(veedores))

      if (veedorUsuarioInput) veedorUsuarioInput.value = ''
      if (veedorPasswordInput) veedorPasswordInput.value = ''
      if (veedorColegioSearch) veedorColegioSearch.value = ''
      if (veedorColegioSelected) veedorColegioSelected.textContent = ''
      selectedVeedorColegio = ''
      if (veedorFormDiv) veedorFormDiv.style.display = 'none'

      alert(`Delegado "${usuario}" creado exitosamente para ${selectedVeedorColegio}`)
      renderVeedores()
    })
  }

  renderVeedores()
}

function bindColegio() {
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
    logoutButton.addEventListener('click', () => {
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

  // Crear delegados
  const delegadoUsuarioInput = document.querySelector<HTMLInputElement>('#colegio-delegado-usuario')
  const delegadoPasswordInput = document.querySelector<HTMLInputElement>('#colegio-delegado-password')
  const btnCrearDelegadoColegio = document.querySelector<HTMLButtonElement>('#btn-crear-delegado-colegio')
  const delegadosColegioList = document.querySelector<HTMLElement>('#delegados-colegio-list')

  let delegadosCreados: Array<{ id: number; usuario: string; password: string }> = JSON.parse(
    localStorage.getItem('veedoresColegio') || '[]'
  )

  const renderDelegados = () => {
    if (!delegadosColegioList) return
    if (delegadosCreados.length === 0) {
      delegadosColegioList.innerHTML = '<p class="empty">No hay delegados registrados en este colegio</p>'
      return
    }

    delegadosColegioList.innerHTML = delegadosCreados
      .map(
        (delegado) => `<div class="veedor-item">
          <div class="veedor-info">
            <strong>${delegado.usuario}</strong>
            <span>Colegio Central</span>
          </div>
          <button type="button" class="btn-delete-delegado" data-id="${delegado.id}">Eliminar</button>
        </div>`
      )
      .join('')

    // Add delete event listeners
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-delegado').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id as string)
        delegadosCreados = delegadosCreados.filter((d) => d.id !== id)
        localStorage.setItem('veedoresColegio', JSON.stringify(delegadosCreados))
        renderDelegados()
      })
    })
  }

  if (btnCrearDelegadoColegio) {
    btnCrearDelegadoColegio.addEventListener('click', () => {
      const usuario = delegadoUsuarioInput?.value || ''
      const password = delegadoPasswordInput?.value || ''

      if (!usuario || !password) {
        alert('Por favor completa todos los campos')
        return
      }

      // Check if usuario already exists
      if (delegadosCreados.some((d) => d.usuario === usuario)) {
        alert('Este usuario ya existe')
        return
      }

      const newDelegado = {
        id: Date.now(),
        usuario,
        password,
      }

      delegadosCreados.push(newDelegado)
      localStorage.setItem('veedoresColegio', JSON.stringify(delegadosCreados))

      if (delegadoUsuarioInput) delegadoUsuarioInput.value = ''
      if (delegadoPasswordInput) delegadoPasswordInput.value = ''

      alert(`Delegado "${usuario}" creado exitosamente`)
      renderDelegados()
    })
  }

  renderDelegados()

  // Solicitudes de anulación
  const solicitudesList = document.querySelector<HTMLElement>('#solicitudes-list')
  if (solicitudesList) {
    const solicitudes = JSON.parse(localStorage.getItem('solicitudesAnulacion') || '[]')

    const renderSolicitudes = () => {
      if (solicitudes.length === 0) {
        solicitudesList.innerHTML = '<p class="empty">No hay solicitudes de anulación</p>'
      } else {
        solicitudesList.innerHTML = solicitudes
          .map(
            (solicitud: any, idx: number) => `<div class="mesa-item">
              <div class="mesa-info">
                <strong>Solicitud #${idx + 1}</strong>
                <span>${solicitud.fecha}</span>
              </div>
              <button type="button" class="btn-anular-solicitud" data-idx="${idx}" style="background: #28a745; color: white;">
                Anular Mesa
              </button>
            </div>`
          )
          .join('')

        // Handlers para anular
        document.querySelectorAll<HTMLButtonElement>('.btn-anular-solicitud').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx as string)
           solicitudes.splice(idx, 1)
            localStorage.setItem('solicitudesAnulacion', JSON.stringify(solicitudes))
            alert('Solicitud anulada')
            renderSolicitudes()
          })
        })
      }
    }

    renderSolicitudes()
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

function renderRoute() {
  const route = getRoute()

  // Permitir /login sin estar logueado, pero redirigir a /login desde otras rutas
  if (route !== 'login' && !isLoggedIn()) {
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
initializeSampleData()
renderRoute()
