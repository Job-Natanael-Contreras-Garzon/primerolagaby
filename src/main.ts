import './style.css'
import { supabase } from './utils/supabase'
import { cache } from './utils/cache'
import { excelHandler } from './utils/excel-handler'
import { chartManager } from './utils/apexcharts-manager'
import { pagination } from './utils/pagination'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor #app')
}

const rootApp = app

type RouteId = 'home' | 'login' | 'panel' | 'admin' | 'carrasco'
type RoleId = 'veedor' | 'distrito' | 'colegio' | 'admin' | 'lector'

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
  if (path === '/admin') return 'admin'
  if (path === '/carrasco') return 'carrasco'
  return 'home'
}

function navigate(path: '/login' | '/' | '/panel' | '/admin' | '/carrasco') {
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
  if (role === 'lector') return 'Lector Electoral'
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

function adminTemplate() {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">🔐 Administrador</p>
          <h1>Control Total</h1>
          <small>Sistema Electoral</small>
        </div>

        <nav class="menu" aria-label="Navegacion principal">
          <button class="menu-link is-active" data-view="admin-dashboard" type="button">📊 Dashboard</button>
          <button class="menu-link" data-view="admin-usuarios" type="button">👥 Usuarios</button>
          <button class="menu-link" data-view="admin-distritos" type="button">🗺️ Distritos</button>
          <button class="menu-link" data-view="admin-recintos" type="button">🏫 Recintos</button>
          <button class="menu-link" data-view="admin-mesas" type="button">📋 Mesas</button>
          <button class="menu-link" data-view="admin-imagenes" type="button">🖼️ Imágenes</button>
          <button class="menu-link" data-view="admin-config" type="button">⚙️ Configuración</button>
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
            <button class="menu-tab is-active" data-view="admin-dashboard" type="button">Dashboard</button>
            <button class="menu-tab" data-view="admin-usuarios" type="button">Usuarios</button>
            <button class="menu-tab" data-view="admin-distritos" type="button">Distritos</button>
            <button class="menu-tab" data-view="admin-mesas" type="button">Mesas</button>
            <button class="menu-tab" data-view="admin-imagenes" type="button">Imágenes</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="admin-logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- VIEW: DASHBOARD -->
        <section id="view-admin-dashboard" class="view-root">
          <article class="card">
            <h3>📊 Dashboard General</h3>
            <p>Estadísticas en tiempo real del sistema electoral</p>
            
            <div class="stats-grid" id="admin-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px;">
              <!-- Stats se cargarán dinámicamente -->
            </div>
          </article>

          <article class="card">
            <h3>📈 Gráfica General de Votos</h3>
            <div id="admin-pie-chart" style="width:100%;height:350px;"></div>
          </article>

          <article class="card">
            <h3>🔴 Incidencias Pendientes</h3>
            <div id="admin-incidencias-list" class="mesas-list"></div>
          </article>
        </section>

        <!-- VIEW: USUARIOS -->
        <section id="view-admin-usuarios" class="view-root" style="display: none;">
          <article class="card">
            <h3>➕ Crear Nuevo Usuario</h3>
            <form id="admin-form-usuario" class="form-grid" style="margin-top: 12px;">
              <label for="admin-user-nombre">Nombre</label>
              <input id="admin-user-nombre" type="text" required />
              
              <label for="admin-user-apellido">Apellido</label>
              <input id="admin-user-apellido" type="text" required />
              
              <label for="admin-user-email">Email</label>
              <input id="admin-user-email" type="email" required />
              
              <label for="admin-user-rol">Rol</label>
              <select id="admin-user-rol" required>
                <option value="veedor">Veedor</option>
                <option value="supervisor1">Responsable de Colegio</option>
                <option value="supervisor2">Supervisor de Distrito</option>
                <option value="admin">Administrador</option>
              </select>
              
              <label for="admin-user-distrito">Distrito (si aplica)</label>
              <select id="admin-user-distrito">
                <option value="">Ninguno</option>
              </select>

              <label for="admin-user-recinto">Recinto (si aplica)</label>
              <select id="admin-user-recinto">
                <option value="">Ninguno</option>
              </select>
              
              <button class="cta" type="submit" style="grid-column: 1 / -1;">Crear Usuario</button>
            </form>
          </article>

          <article class="card">
            <h3>📋 Listado de Usuarios</h3>
            <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="btn-export-usuarios" class="cta-secondary" style="flex:1;min-width:140px;">📥 Exportar Excel</button>
              <button type="button" id="btn-import-usuarios" class="cta-secondary" style="flex:1;min-width:140px;">📤 Importar Excel</button>
              <button type="button" id="btn-plantilla-usuarios" class="cta-secondary" style="flex:1;min-width:140px;">📋 Plantilla</button>
            </div>
            <div id="admin-usuarios-list" class="users-list" style="margin-top: 16px;"></div>
            <div id="admin-usuarios-pagination" style="margin-top: 16px;"></div>
            <input type="file" id="input-import-usuarios" accept=".xlsx,.xls" style="display: none;" />
          </article>
        </section>

        <!-- VIEW: DISTRITOS -->
        <section id="view-admin-distritos" class="view-root" style="display: none;">
          <article class="card">
            <h3>➕ Crear Nuevo Distrito</h3>
            <form id="admin-form-distrito" class="form-grid" style="margin-top: 12px;">
              <label for="admin-dist-nombre">Nombre</label>
              <input id="admin-dist-nombre" type="text" required />
              
              <label for="admin-dist-numero">Número</label>
              <input id="admin-dist-numero" type="number" required />
              
              <button class="cta" type="submit" style="grid-column: 1 / -1;">Crear Distrito</button>
            </form>
          </article>

          <article class="card">
            <h3>📋 Listado de Distritos</h3>
            <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="btn-export-distritos" class="cta-secondary" style="flex:1;min-width:140px;">📥 Exportar Excel</button>
              <button type="button" id="btn-import-distritos" class="cta-secondary" style="flex:1;min-width:140px;">📤 Importar Excel</button>
            </div>
            <div id="admin-distritos-list" class="distritos-list" style="margin-top: 16px;"></div>
            <div id="admin-distritos-pagination" style="margin-top: 16px;"></div>
            <input type="file" id="input-import-distritos" accept=".xlsx,.xls" style="display: none;" />
          </article>
        </section>

        <!-- VIEW: RECINTOS -->
        <section id="view-admin-recintos" class="view-root" style="display: none;">
          <article class="card">
            <h3>➕ Crear Nuevo Recinto</h3>
            <form id="admin-form-recinto" class="form-grid" style="margin-top: 12px;">
              <label for="admin-rec-nombre">Nombre del Recinto</label>
              <input id="admin-rec-nombre" type="text" required />
              
              <label for="admin-rec-distrito">Distrito</label>
              <select id="admin-rec-distrito" required>
                <option value="">Selecciona un distrito</option>
              </select>
              
              <label for="admin-rec-direccion">Dirección</label>
              <input id="admin-rec-direccion" type="text" />
              
              <button class="cta" type="submit" style="grid-column: 1 / -1;">Crear Recinto</button>
            </form>
          </article>

          <article class="card">
            <h3>📋 Listado de Recintos</h3>
            <div id="admin-recintos-list" class="recintos-list" style="margin-top: 16px;"></div>
          </article>
        </section>

        <!-- VIEW: MESAS -->
        <section id="view-admin-mesas" class="view-root" style="display: none;">
          <article class="card">
            <h3>🔍 Búsqueda de Mesas</h3>
            <div class="search-input-wrapper" style="margin-top: 12px;">
              <input id="admin-mesas-search" type="search" placeholder="Busca por número, colegio o estado..." />
              <button type="button" id="admin-mesas-dropdown" class="search-dropdown-btn" title="Ver todas">▼</button>
            </div>
            <ul id="admin-mesas-results" class="search-list" style="margin-top: 12px;"></ul>
          </article>

          <article class="card">
            <h3>📊 Resumen de Mesas</h3>
            <div id="admin-mesas-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;"></div>
          </article>
        </section>

        <!-- VIEW: IMÁGENES -->
        <section id="view-admin-imagenes" class="view-root" style="display: none;">
          <article class="card">
            <h3>🖼️ Galería de Actas</h3>
            <p>Todas las imágenes de actas transmitidas</p>
            <div id="admin-imagenes-gallery" class="imagenes-gallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 16px;"></div>
          </article>
        </section>

        <!-- VIEW: CONFIGURACIÓN -->
        <section id="view-admin-config" class="view-root" style="display: none;">
          <article class="card">
            <h3>⚙️ Configuración del Sistema</h3>
            <p style="margin-top: 12px;">Administra la configuración global del monitoreo</p>
            
            <div style="margin-top: 16px;">
              <label for="admin-config-cargo">Cargo a mostrar</label>
              <select id="admin-config-cargo">
                <option value="alcalde">Alcalde</option>
                <option value="concejal">Concejal</option>
                <option value="ambos">Ambos</option>
              </select>

              <label style="margin-top: 12px;">Elementos a mostrar</label>
              <div style="margin-top: 8px;">
                <label><input type="checkbox" id="admin-config-blancos" checked> Votos en blanco</label><br>
                <label><input type="checkbox" id="admin-config-nulos" checked> Votos nulos</label><br>
                <label><input type="checkbox" id="admin-config-validos" checked> Votos válidos</label>
              </div>

              <button class="cta" type="button" id="admin-btn-guardar-config" style="margin-top: 16px;">Guardar Configuración</button>
            </div>
          </article>
        </section>
      </main>
    </div>

    <!-- MODAL: EDITAR USUARIO -->
    <div id="modal-edit-usuario" class="modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
      <article class="card" style="width:90%;max-width:400px;padding:24px;">
        <h3>Editar Usuario</h3>
        <form id="form-edit-usuario" class="form-grid" style="margin-top:16px;">
          <input type="hidden" id="edit-usuario-id" />
          
          <label for="edit-usuario-nombre">Nombre</label>
          <input id="edit-usuario-nombre" type="text" required />
          
          <label for="edit-usuario-apellido">Apellido</label>
          <input id="edit-usuario-apellido" type="text" required />
          
          <label for="edit-usuario-email">Email</label>
          <input id="edit-usuario-email" type="email" required disabled />
          
          <label for="edit-usuario-rol">Rol</label>
          <select id="edit-usuario-rol" required>
            <option value="veedor">Veedor</option>
            <option value="supervisor1">Responsable de Colegio</option>
            <option value="supervisor2">Supervisor de Distrito</option>
            <option value="admin">Administrador</option>
          </select>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;grid-column:1/-1;margin-top:12px;">
            <button type="submit" class="cta">Guardar</button>
            <button type="button" class="cta-secondary" id="btn-close-edit-usuario">Cancelar</button>
          </div>
        </form>
      </article>
    </div>

    <!-- MODAL: EDITAR DISTRITO -->
    <div id="modal-edit-distrito" class="modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
      <article class="card" style="width:90%;max-width:400px;padding:24px;">
        <h3>Editar Distrito</h3>
        <form id="form-edit-distrito" class="form-grid" style="margin-top:16px;">
          <input type="hidden" id="edit-distrito-id" />
          
          <label for="edit-distrito-nombre">Nombre</label>
          <input id="edit-distrito-nombre" type="text" required />
          
          <label for="edit-distrito-numero">Número</label>
          <input id="edit-distrito-numero" type="number" required />
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;grid-column:1/-1;margin-top:12px;">
            <button type="submit" class="cta">Guardar</button>
            <button type="button" class="cta-secondary" id="btn-close-edit-distrito">Cancelar</button>
          </div>
        </form>
      </article>
    </div>

    <!-- MODAL: EDITAR RECINTO -->
    <div id="modal-edit-recinto" class="modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
      <article class="card" style="width:90%;max-width:400px;padding:24px;">
        <h3>Editar Recinto</h3>
        <form id="form-edit-recinto" class="form-grid" style="margin-top:16px;">
          <input type="hidden" id="edit-recinto-id" />
          
          <label for="edit-recinto-nombre">Nombre</label>
          <input id="edit-recinto-nombre" type="text" required />
          
          <label for="edit-recinto-distrito">Distrito</label>
          <select id="edit-recinto-distrito" required></select>
          
          <label for="edit-recinto-direccion">Dirección</label>
          <input id="edit-recinto-direccion" type="text" />
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;grid-column:1/-1;margin-top:12px;">
            <button type="submit" class="cta">Guardar</button>
            <button type="button" class="cta-secondary" id="btn-close-edit-recinto">Cancelar</button>
          </div>
        </form>
      </article>
    </div>
  `
}

// ════════════════════════════════════════════════════════════════
// TEMPLATE: LECTOR (Monitoreo General de Resultados)
// ════════════════════════════════════════════════════════════════

function lectorTemplate() {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Panel de Monitoreo</p>
          <h1>Lector Electoral</h1>
          <small>Sesion activa: ${getRoleLabel()}</small>
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
            <button class="menu-tab" data-view="graficos" type="button">Gráficos</button>
          </nav>

          <div class="top-actions">
            <button class="ghost-btn" data-go="/" type="button">Ir a reportar</button>
            <button class="danger-btn" id="logout-btn" type="button">Cerrar sesión</button>
          </div>
        </header>

        <!-- VISTA: RESUMEN GENERAL -->
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
            <div id="resumen-partidos" class="parties-grid">
              <!-- Se llena dinámicamente -->
            </div>
          </div>

          <div id="grafico-resumen" style="min-height: 300px;">
            <!-- Gráfico se inserta aquí -->
          </div>
        </div>

        <!-- VISTA: DISTRITOS -->
        <div id="vista-distritos" class="content-view">
          <div class="selector-group">
            <label for="select-distrito">Seleccionar Distrito:</label>
            <select id="select-distrito">
              <option value="">-- Cargando distritos --</option>
            </select>
          </div>

          <div id="detalle-distrito" style="display: none;">
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-label">Mesas en Distrito</span>
                <strong class="stat-value" id="mesas-distrito">0</strong>
              </div>
              <div class="stat-card">
                <span class="stat-label">Mesas Transmitidas</span>
                <strong class="stat-value" id="mesas-tx-distrito">0</strong>
              </div>
              <div class="stat-card">
                <span class="stat-label">Avance</span>
                <strong class="stat-value" id="avance-distrito">0%</strong>
              </div>
            </div>

            <h3>Resultados por Partido</h3>
            <div id="resultados-distrito" class="parties-list">
              <!-- Se llena dinámicamente -->
            </div>

            <div id="grafico-distrito" style="min-height: 300px; margin-top: 20px;">
              <!-- Gráfico de distrito -->
            </div>
          </div>
        </div>

        <!-- VISTA: COLEGIOS -->
        <div id="vista-colegios" class="content-view">
          <div class="selector-group">
            <label for="select-colegio-distrito">Seleccionar Distrito:</label>
            <select id="select-colegio-distrito">
              <option value="">-- Cargando distritos --</option>
            </select>
          </div>

          <div class="selector-group">
            <label for="select-colegio">Seleccionar Colegio:</label>
            <select id="select-colegio" disabled>
              <option value="">-- Selecciona un distrito primero --</option>
            </select>
          </div>

          <div id="detalle-colegio" style="display: none;">
            <h3 id="nombre-colegio"></h3>
            
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-label">Mesas en Colegio</span>
                <strong class="stat-value" id="mesas-colegio">0</strong>
              </div>
              <div class="stat-card">
                <span class="stat-label">Mesas Transmitidas</span>
                <strong class="stat-value" id="mesas-tx-colegio">0</strong>
              </div>
              <div class="stat-card">
                <span class="stat-label">Avance</span>
                <strong class="stat-value" id="avance-colegio">0%</strong>
              </div>
            </div>

            <h4>Estado de Mesas</h4>
            <table class="mesa-table">
              <thead>
                <tr>
                  <th>Mesa N°</th>
                  <th>Habilitados</th>
                  <th>Estado</th>
                  <th>Votos Procesados</th>
                </tr>
              </thead>
              <tbody id="tabla-mesas-colegio">
                <!-- Se llena dinámicamente -->
              </tbody>
            </table>

            <div id="grafico-colegio" style="min-height: 300px; margin-top: 20px;">
              <!-- Gráfico de colegio -->
            </div>
          </div>
        </div>

        <!-- VISTA: GRÁFICOS -->
        <div id="vista-graficos" class="content-view">
          <h3>Gráficos Nacionales</h3>
          <div id="grafico-nacional" style="min-height: 400px;">
            <!-- Gráfico nacional -->
          </div>

          <h3 style="margin-top: 40px;">Progreso de Transmisión</h3>
          <div id="grafico-progreso" style="min-height: 300px;">
            <!-- Gráfico de progreso -->
          </div>
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

      .selector-group label {
        font-weight: 600;
        color: #333;
      }

      .selector-group select {
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background: white;
        cursor: pointer;
      }

      .selector-group select:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
        color: #999;
      }

      .content-view {
        display: none;
        animation: fadeIn 0.3s ease-in;
      }

      .content-view.is-active {
        display: block;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
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

      .party-card strong {
        display: block;
        font-size: 18px;
        color: #007bff;
        margin: 8px 0;
      }

      .mesa-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }

      .mesa-table th,
      .mesa-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .mesa-table th {
        background: #f8f9fa;
        font-weight: 600;
      }

      .mesa-table tr:hover {
        background: #f5f5f5;
      }

      .state-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .state-badge.transmitida {
        background: #d4edda;
        color: #155724;
      }

      .state-badge.pendiente {
        background: #fff3cd;
        color: #856404;
      }

      .state-badge.incidencia {
        background: #f8d7da;
        color: #721c24;
      }
    </style>
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
            ${role === 'admin' ? `<button class="btn-link" data-go="/admin" type="button" style="color:#007bff;font-weight:bold;">🔐 Panel Admin</button>` : ''}
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
      } else if (rol === 'lector') {
        navigate('/carrasco')
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

    // Consultar vista_monitoreo sin filtro de tipo_cargo (la vista puede no tenerlo)
    let query = supabase
      .from('vista_monitoreo')
      .select('partido_id, partido, sigla, color_hex, total_votos')
      // Removido: .eq('tipo_cargo', tipoCargo)  - La vista no tiene este filtro

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

async function bindAdmin() {
  // ─── NAVEGACIÓN DE VISTAS ────────────────────────────────────────────────
  const adminMenuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link')
  const adminMenuTabs = document.querySelectorAll<HTMLButtonElement>('.menu-tab')
  const adminViewTitle = document.querySelector<HTMLElement>('#admin-view-title')
  const adminLogoutBtn = document.querySelector<HTMLButtonElement>('#admin-logout-btn')

  const adminShowView = (viewName: string) => {
    const viewSections = document.querySelectorAll<HTMLElement>('.view-root')
    viewSections.forEach((section) => (section.style.display = 'none'))

    const targetView = document.querySelector<HTMLElement>(`#view-${viewName}`)
    if (targetView) targetView.style.display = 'block'

    // Actualizar título
    const titleMap: { [key: string]: string } = {
      'admin-dashboard': '📊 Dashboard',
      'admin-usuarios': '👥 Usuarios',
      'admin-distritos': '🗺️ Distritos',
      'admin-recintos': '🏫 Recintos',
      'admin-mesas': '📋 Mesas',
      'admin-imagenes': '🖼️ Imágenes',
      'admin-config': '⚙️ Configuración',
    }
    if (adminViewTitle) adminViewTitle.textContent = titleMap[viewName] || viewName
  }

  adminMenuLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      adminMenuLinks.forEach((b) => b.classList.remove('is-active'))
      adminMenuTabs.forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      const correspondingTab = document.querySelector<HTMLButtonElement>(
        `.menu-tab[data-view="${btn.dataset.view}"]`
      )
      if (correspondingTab) correspondingTab.classList.add('is-active')
      adminShowView(btn.dataset.view || 'admin-dashboard')
    })
  })

  adminMenuTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      adminMenuLinks.forEach((b) => b.classList.remove('is-active'))
      adminMenuTabs.forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      const correspondingLink = document.querySelector<HTMLButtonElement>(
        `.menu-link[data-view="${btn.dataset.view}"]`
      )
      if (correspondingLink) correspondingLink.classList.add('is-active')
      adminShowView(btn.dataset.view || 'admin-dashboard')
    })
  })

  // Logout
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut()
      window.localStorage.removeItem('authRole')
      navigate('/login')
    })
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  const loadAdminDashboard = async () => {
    // Cargar estadísticas generales
    const statsGrid = document.querySelector<HTMLElement>('#admin-stats-grid')
    if (statsGrid) {
      const [usuarios, distritos, mesas, transmisiones] = await Promise.all([
        supabase.from('usuarios').select('id', { count: 'exact' }).eq('activo', true),
        supabase.from('distritos').select('id', { count: 'exact' }).eq('activo', true),
        supabase.from('mesas').select('id', { count: 'exact' }).eq('activo', true),
        supabase.from('transmisiones').select('id', { count: 'exact' }),
      ])

      statsGrid.innerHTML = `
        <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
          <div style="font-size:28px;font-weight:bold;color:#007bff;">${usuarios.count || 0}</div>
          <div style="font-size:12px;color:#666;">Usuarios</div>
        </div>
        <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
          <div style="font-size:28px;font-weight:bold;color:#28a745;">${distritos.count || 0}</div>
          <div style="font-size:12px;color:#666;">Distritos</div>
        </div>
        <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
          <div style="font-size:28px;font-weight:bold;color:#ffc107;">${mesas.count || 0}</div>
          <div style="font-size:12px;color:#666;">Mesas</div>
        </div>
        <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
          <div style="font-size:28px;font-weight:bold;color:#dc3545;">${transmisiones.count || 0}</div>
          <div style="font-size:12px;color:#666;">Transmisiones</div>
        </div>
      `
    }

    // Cargar gráfica de votos con ApexCharts
    const { data: monitorData, error: monitorErr } = await supabase
      .from('vista_monitoreo')
      .select('partido_sigla, partido_color, total_votos')
      .eq('tipo_cargo', 'alcalde')
      .order('total_votos', { ascending: false })

    if (!monitorErr && monitorData && monitorData.length > 0) {
      const chartData = monitorData.map((row: any) => ({
        sigla: row.partido_sigla,
        color: row.partido_color || '#999',
        total: row.total_votos,
      }))
      chartManager.createPieChart('admin-pie-chart', chartData, '📊 Votos por Partido - Alcalde')
    } else {
      const chartContainer = document.querySelector('#admin-pie-chart')
      if (chartContainer) chartContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Sin datos de votos</div>'
    }

    // Cargar incidencias pendientes
    const incidenciasList = document.querySelector<HTMLElement>('#admin-incidencias-list')
    if (incidenciasList) {
      const { data: incidenciasData, error } = await supabase
        .from('incidencias')
        .select('id, justificativo, estado, created_at, mesas(numero_mesa), usuarios(nombre, apellido)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && incidenciasData) {
        if (incidenciasData.length === 0) {
          incidenciasList.innerHTML = '<p class="empty" style="color:#28a745;font-weight:bold;">✓ No hay incidencias pendientes</p>'
        } else {
          incidenciasList.innerHTML = incidenciasData
            .map(
              (inc: any) => `<div class="mesa-item">
              <div class="mesa-info">
                <strong>Mesa ${inc.mesas?.numero_mesa ?? '?'}</strong>
                <span>${inc.justificativo}</span>
                <small style="color:#999">${new Date(inc.created_at).toLocaleString()}</small>
              </div>
            </div>`
            )
            .join('')
        }
      }
    }
  }

  // ─── USUARIOS ─────────────────────────────────────────────────────────────
  let adminUsuariosAllData: any[] = []
  let adminUsuariosCurrentPage = 1

  const loadAdminUsuarios = async () => {
    const usuariosList = document.querySelector<HTMLElement>('#admin-usuarios-list')
    const paginationContainer = document.querySelector<HTMLElement>('#admin-usuarios-pagination')
    if (!usuariosList) return

    // Intentar obtener datos del caché
    let usuariosData = cache.get<any[]>('admin_usuarios')

    if (!usuariosData) {
      // Si no está en caché, obtener de Supabase
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol, activo, distritos(nombre)')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error || !data) {
        usuariosList.innerHTML = '<p class="empty" style="color:#c00">Error cargando usuarios</p>'
        return
      }

      usuariosData = data
      // Guardar en caché por 5 minutos
      cache.set('admin_usuarios', usuariosData, 5)
    }

    adminUsuariosAllData = usuariosData

    if (usuariosData.length === 0) {
      usuariosList.innerHTML = '<p class="empty">No hay usuarios registrados</p>'
      if (paginationContainer) paginationContainer.innerHTML = ''
      return
    }

    // Aplicar paginación
    const pageSize = 100
    const state = pagination.calculate(usuariosData.length, adminUsuariosCurrentPage, pageSize)
    const pagedData = pagination.getPageItems(usuariosData, adminUsuariosCurrentPage, pageSize)

    usuariosList.innerHTML = pagedData
      .map(
        (u: any) => `<div class="mesa-item" style="justify-content:space-between;align-items:center;">
        <div class="mesa-info">
          <strong>${u.nombre} ${u.apellido}</strong>
          <span>${u.email}</span>
          <small style="color:#666;text-transform:capitalize;">${u.rol}${u.distritos ? ` • ${u.distritos.nombre}` : ''}</small>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-edit-user" data-id="${u.id}" style="background:#007bff;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Editar</button>
          <button class="btn-delete-user" data-id="${u.id}" style="background:#dc3545;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Desactivar</button>
        </div>
      </div>`
      )
      .join('')

    // Agregar paginación
    if (paginationContainer) {
      const paginationHTML = pagination.generatePaginationHTML(state)
      paginationContainer.innerHTML = paginationHTML
      pagination.attachPaginationEvents(`admin-usuarios-pagination`, (page) => {
        adminUsuariosCurrentPage = page
        loadAdminUsuarios()
      })
    }

    // Event listeners
    usuariosList.querySelectorAll<HTMLButtonElement>('.btn-delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Desactivar este usuario?')) return
        const userId = parseInt(btn.dataset.id as string)
        const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', userId)
        if (error) {
          alert('Error al desactivar')
        } else {
          cache.remove('admin_usuarios')
          loadAdminUsuarios()
        }
      })
    })

    usuariosList.querySelectorAll<HTMLButtonElement>('.btn-edit-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        const userId = parseInt(btn.dataset.id as string)
        const user = adminUsuariosAllData.find((u) => u.id === userId)
        if (!user) return

        const modal = document.querySelector<HTMLElement>('#modal-edit-usuario')
        if (!modal) return

        document.querySelector<HTMLInputElement>('#edit-usuario-id')!.value = user.id
        document.querySelector<HTMLInputElement>('#edit-usuario-nombre')!.value = user.nombre
        document.querySelector<HTMLInputElement>('#edit-usuario-apellido')!.value = user.apellido
        document.querySelector<HTMLInputElement>('#edit-usuario-email')!.value = user.email
        document.querySelector<HTMLSelectElement>('#edit-usuario-rol')!.value = user.rol

        modal.style.display = 'flex'
      })
    })
  }

  // ─── DISTRITOS ────────────────────────────────────────────────────────────
  const loadAdminDistritos = async () => {
    const distritosList = document.querySelector<HTMLElement>('#admin-distritos-list')
    if (!distritosList) return

    const { data: distritosData, error } = await supabase
      .from('distritos')
      .select('id, nombre, numero_distrito, activo')
      .eq('activo', true)
      .order('numero_distrito', { ascending: true })

    if (error || !distritosData) {
      distritosList.innerHTML = '<p class="empty" style="color:#c00">Error cargando distritos</p>'
      return
    }

    if (distritosData.length === 0) {
      distritosList.innerHTML = '<p class="empty">No hay distritos registrados</p>'
      return
    }

    distritosList.innerHTML = distritosData
      .map(
        (d: any) => `<div class="mesa-item">
        <div class="mesa-info">
          <strong>Distrito ${d.numero_distrito}</strong>
          <span>${d.nombre}</span>
        </div>
        <button class="btn-delete-distrito" data-id="${d.id}" style="background:#dc3545;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Eliminar</button>
      </div>`
      )
      .join('')

    distritosList.querySelectorAll<HTMLButtonElement>('.btn-delete-distrito').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este distrito?')) return
        const { error } = await supabase.from('distritos').delete().eq('id', parseInt(btn.dataset.id as string))
        if (error) alert('Error')
        else loadAdminDistritos()
      })
    })
  }

  // ─── MESAS ────────────────────────────────────────────────────────────────
  const loadAdminMesas = async () => {
    const mesasSearch = document.querySelector<HTMLInputElement>('#admin-mesas-search')
    const mesasResults = document.querySelector<HTMLUListElement>('#admin-mesas-results')
    const mesasStats = document.querySelector<HTMLElement>('#admin-mesas-stats')

    if (mesasStats) {
      const mesasAll = await supabase.from('mesas').select('estado')
      const estados: { [key: string]: number } = {
        pendiente: 0,
        transmitida: 0,
        incidencia: 0,
        no_validada: 0,
      }
      mesasAll.data?.forEach((m: any) => {
        estados[m.estado]++
      })

      mesasStats.innerHTML = `
        <div style="padding:12px;border-radius:6px;background:#fef3cd;">
          <strong style="color:#856404;">${estados.pendiente}</strong><br><small>Pendientes</small>
        </div>
        <div style="padding:12px;border-radius:6px;background:#d1ecf1;">
          <strong style="color:#0c5460;">${estados.transmitida}</strong><br><small>Transmitidas</small>
        </div>
        <div style="padding:12px;border-radius:6px;background:#f8d7da;">
          <strong style="color:#721c24;">${estados.incidencia}</strong><br><small>Incidencias</small>
        </div>
        <div style="padding:12px;border-radius:6px;background:#e2e3e5;">
          <strong>${estados.no_validada}</strong><br><small>No validadas</small>
        </div>
      `
    }

    // Search
    if (mesasSearch && mesasResults) {
      const handleMesasSearch = async (query: string) => {
        if (!query.trim()) {
          mesasResults.innerHTML = ''
          return
        }

        const { data: searchResults, error } = await supabase
          .from('mesas')
          .select('id, numero_mesa, estado, recintos(nombre)')
          .ilike('numero_mesa', `%${query}%`)
          .limit(20)

        if (error || !searchResults) {
          mesasResults.innerHTML = '<li class="empty">Error buscando mesas</li>'
          return
        }

        mesasResults.innerHTML = searchResults
          .map(
            (m: any) => `<li class="search-item">
            <strong>Mesa ${m.numero_mesa}</strong><br>
            <small>${m.recintos?.nombre ?? 'Sin recinto'} • Estado: ${m.estado}</small>
          </li>`
          )
          .join('')
      }

      mesasSearch.addEventListener('input', (e) => {
        handleMesasSearch((e.target as HTMLInputElement).value)
      })
    }
  }

  // ─── IMÁGENES ─────────────────────────────────────────────────────────────
  const loadAdminImagenes = async () => {
    const gallery = document.querySelector<HTMLElement>('#admin-imagenes-gallery')
    if (!gallery) return

    gallery.innerHTML = '<p class="empty">Cargando imágenes...</p>'

    const { data: transmisiones, error } = await supabase
      .from('transmisiones')
      .select('id, imagen_acta_url, created_at, mesas(numero_mesa), usuarios(nombre)')
      .eq('es_valida', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !transmisiones) {
      gallery.innerHTML = '<p class="empty" style="color:#c00">Error cargando imágenes</p>'
      return
    }

    if (transmisiones.length === 0) {
      gallery.innerHTML = '<p class="empty">No hay imágenes de actas</p>'
      return
    }

    gallery.innerHTML = transmisiones
      .map(
        (t: any) => `<div style="cursor:pointer;border:1px solid #ddd;border-radius:6px;overflow:hidden;" title="Haz clic para ampliar">
        ${t.imagen_acta_url ? `<img src="${t.imagen_acta_url}" style="width:100%;height:150px;object-fit:cover;" />` : '<div style="width:100%;height:150px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;">Sin imagen</div>'}
        <div style="padding:8px;font-size:11px;background:#f8f9fa;">
          <strong>Mesa ${(t.mesas as any)?.numero_mesa ?? '?'}</strong><br>
          ${new Date(t.created_at).toLocaleDateString()}
        </div>
      </div>`
      )
      .join('')

    // Modal para ampliar imágenes
    gallery.querySelectorAll<HTMLElement>('[title*="Haz clic"]').forEach((img) => {
      img.addEventListener('click', () => {
        const src = img.querySelector('img')?.src
        if (src) {
          alert('Modal de imagen:\n\n' + src + '\n\n(Implementar lightbox aquí)')
        }
      })
    })
  }

  // ─── RECINTOS ────────────────────────────────────────────────────────────
  const loadAdminRecintos = async () => {
    const recintosList = document.querySelector<HTMLElement>('#admin-recintos-list')
    if (!recintosList) return

    const { data: recintosData, error } = await supabase
      .from('recintos')
      .select('id, nombre, direccion, distritos(nombre)')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error || !recintosData) {
      recintosList.innerHTML = '<p class="empty" style="color:#c00">Error cargando recintos</p>'
      return
    }

    if (recintosData.length === 0) {
      recintosList.innerHTML = '<p class="empty">No hay recintos registrados</p>'
      return
    }

    recintosList.innerHTML = recintosData
      .map(
        (r: any) => `<div class="mesa-item">
        <div class="mesa-info">
          <strong>${r.nombre}</strong>
          <span>${r.direccion || 'Sin dirección'}</span>
          <small style="color:#666;">${(r.distritos as any)?.nombre ?? 'Sin distrito'}</small>
        </div>
        <button class="btn-delete-recinto" data-id="${r.id}" style="background:#dc3545;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Eliminar</button>
      </div>`
      )
      .join('')

    recintosList.querySelectorAll<HTMLButtonElement>('.btn-delete-recinto').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este recinto?')) return
        const { error } = await supabase.from('recintos').delete().eq('id', parseInt(btn.dataset.id as string))
        if (error) alert('Error')
        else loadAdminRecintos()
      })
    })
  }

  // ─── CREAR USUARIOS ────────────────────────────────────────────────────
  const formUsuario = document.querySelector<HTMLFormElement>('#admin-form-usuario')
  const distritosSelect = document.querySelector<HTMLSelectElement>('#admin-user-distrito')

  // Cargar distritos en el select
  const loadDistritosSelect = async () => {
    if (distritosSelect) {
      const { data: distritos } = await supabase
        .from('distritos')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (distritos) {
        distritosSelect.innerHTML = '<option value="">Ninguno</option>'
        distritos.forEach((d) => {
          const opt = document.createElement('option')
          opt.value = d.id.toString()
          opt.textContent = d.nombre
          distritosSelect.appendChild(opt)
        })
      }
    }
  }
  await loadDistritosSelect()

  if (formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nombre = (document.querySelector<HTMLInputElement>('#admin-user-nombre')?.value || '').trim()
      const apellido = (document.querySelector<HTMLInputElement>('#admin-user-apellido')?.value || '').trim()
      const email = (document.querySelector<HTMLInputElement>('#admin-user-email')?.value || '').trim()
      const rol = (document.querySelector<HTMLSelectElement>('#admin-user-rol')?.value || '') as RoleId
      const distId = (document.querySelector<HTMLSelectElement>('#admin-user-distrito')?.value || '') as string

      if (!nombre || !apellido || !email || !rol) {
        alert('Completa todos los campos requeridos')
        return
      }

      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(2, 10),
        email_confirm: true,
      })

      if (error) {
        alert(`Error creando usuario: ${error.message}`)
        return
      }

      // Insertar en tabla de usuarios
      const { error: insertErr } = await supabase.from('usuarios').insert({
        auth_id: data.user.id,
        nombre,
        apellido,
        email,
        rol,
        distrito_id: distId ? parseInt(distId) : null,
      })

      if (insertErr) {
        alert(`Error: ${insertErr.message}`)
        return
      }

      alert('✅ Usuario creado exitosamente')
      formUsuario.reset()
      loadAdminUsuarios()
    })
  }

  // ─── CREAR DISTRITOS ────────────────────────────────────────────────────
  const formDistrito = document.querySelector<HTMLFormElement>('#admin-form-distrito')
  if (formDistrito) {
    formDistrito.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nombre = (document.querySelector<HTMLInputElement>('#admin-dist-nombre')?.value || '').trim()
      const numero = parseInt(document.querySelector<HTMLInputElement>('#admin-dist-numero')?.value || '0')

      if (!nombre || !numero) {
        alert('Completa todos los campos')
        return
      }

      const { error } = await supabase.from('distritos').insert({
        nombre,
        numero_distrito: numero,
        municipio_id: 1, // Asumiendo municipio default
      })

      if (error) {
        alert(`Error: ${error.message}`)
        return
      }

      alert('✅ Distrito creado exitosamente')
      formDistrito.reset()
      loadAdminDistritos()
    })
  }

  // ─── CREAR RECINTOS ────────────────────────────────────────────────────
  const formRecinto = document.querySelector<HTMLFormElement>('#admin-form-recinto')
  const recintoDistritoSelect = document.querySelector<HTMLSelectElement>('#admin-rec-distrito')

  const loadDistritosRecinto = async () => {
    if (recintoDistritoSelect) {
      const { data: distritos } = await supabase
        .from('distritos')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (distritos) {
        recintoDistritoSelect.innerHTML = '<option value="">Selecciona un distrito</option>'
        distritos.forEach((d) => {
          const opt = document.createElement('option')
          opt.value = d.id.toString()
          opt.textContent = d.nombre
          recintoDistritoSelect.appendChild(opt)
        })
      }
    }
  }
  await loadDistritosRecinto()

  if (formRecinto) {
    formRecinto.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nombre = (document.querySelector<HTMLInputElement>('#admin-rec-nombre')?.value || '').trim()
      const distritoId = parseInt(recintoDistritoSelect?.value || '0')
      const direccion = (document.querySelector<HTMLInputElement>('#admin-rec-direccion')?.value || '').trim()

      if (!nombre || !distritoId) {
        alert('Completa los campos requeridos')
        return
      }

      const { error } = await supabase.from('recintos').insert({
        nombre,
        distrito_id: distritoId,
        direccion: direccion || null,
      })

      if (error) {
        alert(`Error: ${error.message}`)
        return
      }

      alert('✅ Recinto creado exitosamente')
      formRecinto.reset()
      loadAdminRecintos()
    })
  }

  // ─── HANDLERS DE EXPORTAR/IMPORTAR EXCEL ────────────────────────────────
  
  // Usuarios
  const btnExportUsuarios = document.querySelector<HTMLButtonElement>('#btn-export-usuarios')
  const btnImportUsuarios = document.querySelector<HTMLButtonElement>('#btn-import-usuarios')
  const btnPlantillaUsuarios = document.querySelector<HTMLButtonElement>('#btn-plantilla-usuarios')
  const inputImportUsuarios = document.querySelector<HTMLInputElement>('#input-import-usuarios')

  if (btnExportUsuarios) {
    btnExportUsuarios.addEventListener('click', () => {
      excelHandler.exportUsuarios(adminUsuariosAllData)
    })
  }

  if (btnPlantillaUsuarios) {
    btnPlantillaUsuarios.addEventListener('click', () => {
      excelHandler.descargarPlantillaUsuarios()
    })
  }

  if (btnImportUsuarios && inputImportUsuarios) {
    btnImportUsuarios.addEventListener('click', () => inputImportUsuarios.click())
    inputImportUsuarios.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const data = await excelHandler.leerArchivo(file)
        // TODO: Procesar datos e importar a Supabase
        alert(`Se procesarán ${data.length} filas`)
      } catch (err) {
        alert('Error al leer archivo: ' + err)
      }
    })
  }

  // Distritos
  const btnExportDistritos = document.querySelector<HTMLButtonElement>('#btn-export-distritos')
  if (btnExportDistritos) {
    btnExportDistritos.addEventListener('click', () => {
      // TODO: Usar adminDistritosAllData cuando esté disponible
      alert('Descargar Excel de distritos')
    })
  }

  // Modal de editar usuario
  const modalEditUsuario = document.querySelector<HTMLElement>('#modal-edit-usuario')
  const formEditUsuario = document.querySelector<HTMLFormElement>('#form-edit-usuario')
  const btnCloseEditUsuario = document.querySelector<HTMLButtonElement>('#btn-close-edit-usuario')

  if (btnCloseEditUsuario) {
    btnCloseEditUsuario.addEventListener('click', () => {
      if (modalEditUsuario) modalEditUsuario.style.display = 'none'
    })
  }

  // ─── CERRAR MODAL DE EDITAR RECINTO ────────────────────────────────────
  const modalEditRecinto = document.querySelector<HTMLElement>('#modal-edit-recinto')
  const btnCloseEditRecinto = document.querySelector<HTMLButtonElement>('#btn-close-edit-recinto')

  if (btnCloseEditRecinto) {
    btnCloseEditRecinto.addEventListener('click', () => {
      if (modalEditRecinto) modalEditRecinto.style.display = 'none'
    })
  }

  if (formEditUsuario) {
    formEditUsuario.addEventListener('submit', async (e) => {
      e.preventDefault()
      const userId = parseInt(document.querySelector<HTMLInputElement>('#edit-usuario-id')!.value)
      const nombre = document.querySelector<HTMLInputElement>('#edit-usuario-nombre')!.value
      const apellido = document.querySelector<HTMLInputElement>('#edit-usuario-apellido')!.value
      const rol = document.querySelector<HTMLSelectElement>('#edit-usuario-rol')!.value

      const { error } = await supabase
        .from('usuarios')
        .update({ nombre, apellido, rol })
        .eq('id', userId)

      if (error) {
        alert('Error al actualizar: ' + error.message)
      } else {
        alert('✅ Usuario actualizado')
        if (modalEditUsuario) modalEditUsuario.style.display = 'none'
        cache.remove('admin_usuarios')
        loadAdminUsuarios()
      }
    })
  }

  // Cerrar modal al hacer click fuera
  if (modalEditUsuario) {
    modalEditUsuario.addEventListener('click', (e) => {
      if (e.target === modalEditUsuario) {
        modalEditUsuario.style.display = 'none'
      }
    })
  }

  // ─── CARGAR TODAS LAS VISTAS INICIALES ──────────────────────────────────
  await loadAdminDashboard()
  await loadAdminUsuarios()
  await loadAdminDistritos()
  await loadAdminRecintos()
  await loadAdminMesas()
  await loadAdminImagenes()

  // ─── REALTIME UPDATES ───────────────────────────────────────────────────
  const adminChannel = supabase
    .channel('admin-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transmisiones' }, () => {
      loadAdminDashboard()
      loadAdminImagenes()
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidencias' }, () => {
      loadAdminDashboard()
    })
    .subscribe()

  // Cleanup
  window.addEventListener('popstate', () => {
    adminChannel.unsubscribe()
  })
}

// ════════════════════════════════════════════════════════════════
// BIND: LECTOR (Monitoreo General)
// ════════════════════════════════════════════════════════════════

async function bindCarrasco() {
  // ────────────────────────────────────────────────────────────────
  // 1. CARGAR DATOS INICIALES
  // ────────────────────────────────────────────────────────────────

  const loadResumenGeneral = async () => {
    // Cargar todas las mesas y sus estados
    const { data: mesasData } = await supabase
      .from('mesas')
      .select('id, estado')

    if (!mesasData) return

    const totalMesas = mesasData.length
    const mesasTransmitidas = mesasData.filter((m: any) => m.estado === 'transmitida').length
    const porcentaje = totalMesas > 0 ? Math.round((mesasTransmitidas / totalMesas) * 100) : 0

    document.getElementById('total-mesas')!.textContent = totalMesas.toString()
    document.getElementById('mesas-transmitidas')!.textContent = mesasTransmitidas.toString()
    document.getElementById('porcentaje-transmitidas')!.textContent = porcentaje + '%'

    // Cargar distritos
    const { data: distritosData } = await supabase.from('distritos').select('id').eq('activo', true)
    document.getElementById('distritos-procesados')!.textContent = distritosData?.length.toString() || '0'

    // Cargar resultados por partido
    const { data: resultadosData } = await supabase
      .from('resultados_transmision')
      .select('partidos(nombre), votos')

    const partidosMap = new Map<string, number>()
    resultadosData?.forEach((r: any) => {
      const partidoNombre = r.partidos?.nombre || 'Desconocido'
      partidosMap.set(partidoNombre, (partidosMap.get(partidoNombre) || 0) + r.votos)
    })

    const partidosHtml = Array.from(partidosMap.entries())
      .map(
        ([partido, votos]) => `
      <div class="party-card">
        <small>${partido}</small>
        <strong>${votos.toLocaleString()}</strong>
        <span style="font-size:12px;color:#666;">votos</span>
      </div>
    `
      )
      .join('')

    document.getElementById('resumen-partidos')!.innerHTML = partidosHtml || '<p>No hay datos aún</p>'
  }

  const loadDistritos = async () => {
    const { data: distritosData } = await supabase
      .from('distritos')
      .select('id, nombre, numero_distrito')
      .eq('activo', true)
      .order('numero_distrito', { ascending: true })

    const selector = document.getElementById('select-distrito') as HTMLSelectElement
    const selectorColegio = document.getElementById('select-colegio-distrito') as HTMLSelectElement

    selector.innerHTML =
      '<option value="">-- Seleccionar Distrito --</option>' +
      (distritosData?.map((d: any) => `<option value="${d.id}">${d.numero_distrito} - ${d.nombre}</option>`).join('') || '')

    selectorColegio.innerHTML = selector.innerHTML

    selector.addEventListener('change', loadDetalleDistrito)
    selectorColegio.addEventListener('change', loadColegiosPorDistrito)
  }

  const loadDetalleDistrito = async () => {
    const distritoId = (document.getElementById('select-distrito') as HTMLSelectElement).value
    if (!distritoId) {
      document.getElementById('detalle-distrito')!.style.display = 'none'
      return
    }

    // Cargar mesas del distrito
    const { data: mesasData } = await supabase
      .from('mesas')
      .select('id, estado')
      .in(
        'recinto_id',
        (
          await supabase
            .from('recintos')
            .select('id')
            .eq('distrito_id', parseInt(distritoId))
        ).data?.map((r: any) => r.id) || []
      )

    const totalMesas = mesasData?.length || 0
    const mesasTransmitidas = mesasData?.filter((m: any) => m.estado === 'transmitida').length || 0
    const avance = totalMesas > 0 ? Math.round((mesasTransmitidas / totalMesas) * 100) : 0

    document.getElementById('mesas-distrito')!.textContent = totalMesas.toString()
    document.getElementById('mesas-tx-distrito')!.textContent = mesasTransmitidas.toString()
    document.getElementById('avance-distrito')!.textContent = avance + '%'

    document.getElementById('detalle-distrito')!.style.display = 'block'
  }

  const loadColegiosPorDistrito = async () => {
    const distritoId = (document.getElementById('select-colegio-distrito') as HTMLSelectElement).value
    const selector = document.getElementById('select-colegio') as HTMLSelectElement

    if (!distritoId) {
      selector.disabled = true
      selector.innerHTML = '<option value="">-- Selecciona un distrito primero --</option>'
      return
    }

    selector.disabled = false

    const { data: colegiosData } = await supabase
      .from('recintos')
      .select('id, nombre')
      .eq('distrito_id', parseInt(distritoId))
      .order('nombre', { ascending: true })

    selector.innerHTML =
      '<option value="">-- Seleccionar Colegio --</option>' +
      (colegiosData?.map((c: any) => `<option value="${c.id}">${c.nombre}</option>`).join('') || '')

    selector.addEventListener('change', loadDetalleColegio)
  }

  const loadDetalleColegio = async () => {
    const colegioId = (document.getElementById('select-colegio') as HTMLSelectElement).value
    if (!colegioId) {
      document.getElementById('detalle-colegio')!.style.display = 'none'
      return
    }

    // Cargar nombre del colegio
    const { data: colegioData } = await supabase.from('recintos').select('nombre').eq('id', parseInt(colegioId)).single()

    document.getElementById('nombre-colegio')!.textContent = colegioData?.nombre || 'Colegio'

    // Cargar mesas
    const { data: mesasData } = await supabase
      .from('mesas')
      .select('id, numero_mesa, total_habilitados, estado')
      .eq('recinto_id', parseInt(colegioId))

    const totalMesas = mesasData?.length || 0
    const mesasTransmitidas = mesasData?.filter((m: any) => m.estado === 'transmitida').length || 0
    const avance = totalMesas > 0 ? Math.round((mesasTransmitidas / totalMesas) * 100) : 0

    document.getElementById('mesas-colegio')!.textContent = totalMesas.toString()
    document.getElementById('mesas-tx-colegio')!.textContent = mesasTransmitidas.toString()
    document.getElementById('avance-colegio')!.textContent = avance + '%'

    // Llenar tabla de mesas
    const tabla = document.getElementById('tabla-mesas-colegio')!
    tabla.innerHTML =
      mesasData
        ?.map(
          (m: any) => `
      <tr>
        <td><strong>${m.numero_mesa}</strong></td>
        <td>${m.total_habilitados}</td>
        <td><span class="state-badge ${m.estado}">${m.estado}</span></td>
        <td>--</td>
      </tr>
    `
        )
        .join('') || ''

    document.getElementById('detalle-colegio')!.style.display = 'block'
  }

  // ────────────────────────────────────────────────────────────────
  // 2. BIND EVENTOS DE MENÚ
  // ────────────────────────────────────────────────────────────────

  const menuLinks = document.querySelectorAll<HTMLButtonElement>('.menu-link, .menu-tab')
  const contentViews = document.querySelectorAll<HTMLDivElement>('.content-view')

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const view = link.dataset.view
      if (!view) return

      // Actualizar vista activa
      contentViews.forEach((v) => v.classList.remove('is-active'))
      document.getElementById(`vista-${view}`)?.classList.add('is-active')

      // Actualizar menu activo
      document.querySelectorAll<HTMLButtonElement>('.menu-link, .menu-tab').forEach((l) => {
        l.classList.toggle('is-active', l.dataset.view === view)
      })

      // Actualizar título
      const titles: Record<string, string> = {
        resumen: 'Resumen General',
        distritos: 'Por Distrito',
        colegios: 'Por Colegio',
        graficos: 'Gráficos',
      }
      document.getElementById('lector-title')!.textContent = titles[view] || 'Resumen General'
    })
  })

  // ────────────────────────────────────────────────────────────────
  // 3. LOGOUT
  // ────────────────────────────────────────────────────────────────

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut()
      window.localStorage.removeItem('authRole')
      navigate('/login')
    })
  }

  // ────────────────────────────────────────────────────────────────
  // 4. CARGAR DATOS AL INICIAR
  // ────────────────────────────────────────────────────────────────

  await loadResumenGeneral()
  await loadDistritos()
}

function bindNavigationLinks() {
  const navTargets = document.querySelectorAll<HTMLElement>('[data-go]')
  navTargets.forEach((target) => {
    target.addEventListener('click', () => {
      const path = target.dataset.go
      if (path === '/' || path === '/login' || path === '/panel' || path === '/admin' || path === '/carrasco') {
        navigate(path as '/login' | '/' | '/panel' | '/admin' | '/carrasco')
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

  // Verificar que solo admin acceda a /admin
  if (route === 'admin') {
    const role = window.localStorage.getItem('authRole')
    if (role !== 'admin') {
      alert('⚠️ Acceso denegado: Solo administradores')
      navigate('/')
      return
    }
  }

  // Verificar que solo lector acceda a /carrasco
  if (route === 'carrasco') {
    const role = window.localStorage.getItem('authRole')
    if (role !== 'lector') {
      alert('⚠️ Acceso denegado: Solo lectores')
      navigate('/')
      return
    }
  }

  if (route === 'home') rootApp.innerHTML = homeTemplate()
  if (route === 'login') rootApp.innerHTML = loginTemplate()
  if (route === 'panel') rootApp.innerHTML = panelTemplate()
  if (route === 'admin') rootApp.innerHTML = adminTemplate()
  if (route === 'carrasco') rootApp.innerHTML = lectorTemplate()

  document.body.classList.remove('route-home', 'route-login', 'route-panel', 'route-admin', 'route-carrasco')
  document.body.classList.add(`route-${route}`)

  bindNavigationLinks()
  if (route === 'home') bindPublicHome()
  if (route === 'login') bindLogin()
  if (route === 'admin') bindAdmin()
  if (route === 'carrasco') bindCarrasco()
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
