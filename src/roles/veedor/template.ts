/**
 * Template de Veedor - Vista Pública para reportar resultados
 */

export function veedorTemplate() {
  return `
    <section class="public-shell">
      <header class="public-header">
        <div>
          <p class="badge">Portal Electoral</p>
          <h1>Transmisión de Resultados</h1>
          <p class="lead">Reporta los resultados electorales de tu mesa</p>
        </div>
        <button type="button" class="btn-link-header" id="btn-logout-veedor" style="color: #d90000;">Cerrar sesión</button>
      </header>

      <article class="card large-form">
        <!-- PESTAÑAS -->
        <div class="veedor-tabs" id="veedor-tabs-container">
          <nav class="tabs-nav">
            <button type="button" class="tab-btn is-active" data-tab="reportar">📝 SUBIR DATOS</button>
            <button type="button" class="tab-btn" data-tab="mesas">📋 Mesas Subidas</button>
          </nav>
        </div>

        <!-- SECCIÓN REPORTAR -->
        <div id="tab-reportar" class="tab-content is-active">
          <form class="manual-grid" id="veedor-form">
          
            <!-- PASO 1: SELECCIONAR COLEGIO -->
            <fieldset id="selection-fieldset">
              <legend>Paso 1: ¿Dónde votaste?</legend>
              <p class="section-hint">Busca tu colegio o rellena los datos manualmente</p>

              <div class="selection-toggle">
                <button type="button" class="selection-btn" data-selection="search">🔍 Buscar por nombre de colegio</button>
                <button type="button" class="selection-btn" data-selection="manual">📍 Buscar por distrito</button>
              </div>

              <!-- Panel de búsqueda -->
              <div id="selection-search" class="selection-panel">
                <div class="search-input-wrapper">
                  <input id="colegio-search" type="search" placeholder="Escribe el nombre de tu colegio..." />
                  <button type="button" id="colegio-search-dropdown" class="search-dropdown-btn" title="Ver todos los colegios">▼</button>
                </div>
                <ul id="colegio-results" class="search-list"></ul>
              </div>

              <!-- Panel manual -->
              <div id="selection-manual" class="selection-panel">
                <div class="form-row-2">
                  <div>
                    <label for="veedor-distrito">Distrito</label>
                    <select id="veedor-distrito">
                      <option value="">Selecciona distrito</option>
                    </select>
                  </div>
                  <div>
                    <label for="veedor-colegio">Colegio</label>
                    <select id="veedor-colegio">
                      <option value="">Primero selecciona un distrito</option>
                    </select>
                  </div>
                </div>
                <button type="button" class="cta-secondary" id="btn-manual-confirm">Confirmar y continuar</button>
              </div>
            </fieldset>

            <!-- PASO 2: REGISTRAR DATOS -->
            <fieldset id="data-fieldset" style="display: none;">
              <div class="location-bar">
                <p id="selected-location">Seleccionado: <strong></strong></p>
                <button type="button" class="btn-link" id="btn-change-location">Cambiar</button>
              </div>

              <legend>Paso 2: Registra los resultados</legend>

              <div>
                <label for="veedor-mesa">Número de Mesa</label>
                <input id="veedor-mesa" type="text" placeholder="Ej: M0001" required />
              </div>

              <!-- FOTO - Sin botones visibles hasta que esté listo -->
              <div>
                <label>Foto del acta electoral</label>
                <div class="foto-controls">
                  <button type="button" class="cta-secondary" id="btn-camera" disabled style="opacity: 0.5;">📷 Abrir cámara</button>
                  <button type="button" class="cta-secondary" id="btn-gallery" disabled style="opacity: 0.5;">🖼️ Seleccionar de galería</button>
                </div>
                <p id="camera-status" style="font-size: 12px; color: #888; margin-top: 8px;">⏳ Preparando cámara...</p>
                <input id="veedor-foto-gallery" type="file" accept="image/*" style="display: none;" />
                
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
                <input id="veedor-foto" type="hidden" required />
              </div>

              <!-- Cargo a reportar -->
              <div>
                <label>Cargo a reportar</label>
                <div class="cargo-tabs" id="cargo-tabs"></div>
              </div>

              <!-- Grid de candidatos -->
              <div id="candidatos-grid" class="candidatos-grid"></div>

              <!-- Botón enviar (deshabilitado hasta que todo esté listo) -->
              <button class="cta-large" type="submit" id="submit-btn" disabled style="opacity: 0.5;">
                ⏳ Cargando formulario...
              </button>
            </fieldset>

            <!-- PASO 3: ÉXITO -->
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

        <!-- MESAS SUBIDAS -->
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
