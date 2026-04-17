/**
 * SystemConfig: Configuración global del sistema
 * - Toggles para filtros de cargo
 * - Configurar puntos por voto
 * - Export/Import configuración
 *
 * Máx 180 líneas
 */

import { supabase } from '../../../utils/supabase'

interface SystemConfigProps {
  catalogos?: any
}

export async function createSystemConfig(_props?: SystemConfigProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <h3>⚙️ Configuración de Partidos</h3>
      <p style="margin-bottom:16px;color:#666;">Selecciona qué partidos están activos</p>
      <div id="admin-config-cargos" style="display:grid;gap:12px;"></div>
    </article>

    <article class="card">
      <h3>🔢 Configuración de Puntos</h3>
      <form id="admin-config-puntos" style="display:grid;gap:12px;">
        <label for="admin-config-puntos-alcalde">Puntos por voto (Alcalde)</label>
        <input id="admin-config-puntos-alcalde" type="number" value="3" min="0" />
        
        <label for="admin-config-puntos-concejal">Puntos por voto (Concejal)</label>
        <input id="admin-config-puntos-concejal" type="number" value="1" min="0" />
        
        <button class="cta" type="submit">Guardar Puntos</button>
      </form>
    </article>

    <article class="card">
      <h3>📥 Importar/Exportar</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button id="admin-config-export" class="cta" style="background:#28a745;">Exportar JSON</button>
        <button id="admin-config-import" class="cta" style="background:#007bff;">Importar JSON</button>
      </div>
      <input id="admin-config-import-file" type="file" accept=".json" style="display:none;" />
    </article>

    <article class="card">
      <h3>🌐 Estado del Sistema</h3>
      <div id="admin-config-status" style="display:grid;gap:8px;"></div>
    </article>
  `

  await bindSystemConfig(container)

  return container
}

async function bindSystemConfig(container: HTMLElement) {
  const cargosDiv = container.querySelector<HTMLElement>('#admin-config-cargos')
  const puntosForm = container.querySelector<HTMLFormElement>('#admin-config-puntos')
  const statusDiv = container.querySelector<HTMLElement>('#admin-config-status')
  const exportBtn = container.querySelector<HTMLButtonElement>('#admin-config-export')
  const importBtn = container.querySelector<HTMLButtonElement>('#admin-config-import')
  const importFile = container.querySelector<HTMLInputElement>('#admin-config-import-file')

  // Cargar configuración de partidos
  const { data: partidos, error: partidoErr } = await supabase
    .from('partidos')
    .select('id, nombre, sigla')
    .order('nombre')

  if (!partidoErr && partidos && cargosDiv) {
    cargosDiv.innerHTML = partidos
      .map(
        (partido: any) => `
      <label style="display:flex;align-items:center;gap:8px;">
        <input 
          type="checkbox" 
          class="admin-partido-checkbox" 
          data-partido-id="${partido.id}"
          checked
        />
        <span>${partido.nombre} (${partido.sigla})</span>
      </label>
    `
      )
      .join('')
  }

  // Guardar puntos
  if (puntosForm) {
    puntosForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const alcalde = (container.querySelector<HTMLInputElement>('#admin-config-puntos-alcalde')?.value || '3')
      const concejal = (
        container.querySelector<HTMLInputElement>('#admin-config-puntos-concejal')?.value || '1'
      )

      // Guardar en localStorage
      localStorage.setItem('systemConfig', JSON.stringify({ alcalde, concejal }))
      alert('✅ Configuración guardada')
    })
  }

  // Export
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const { data: partidos } = await supabase.from('partidos').select('*')
      const { data: mesas } = await supabase.from('mesas').select('*')

      const config = {
        exported_at: new Date().toISOString(),
        partidos,
        mesas,
        systemConfig: localStorage.getItem('systemConfig'),
      }

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `config-\${Date.now()}.json`
      a.click()
    })
  }

  // Import
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click()
    })

    importFile.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      const config = JSON.parse(text)

      if (config.systemConfig) {
        localStorage.setItem('systemConfig', config.systemConfig)
      }

      alert('✅ Configuración importada')
      location.reload()
    })
  }

  // Status
  if (statusDiv) {
    const { count: partidoCount } = await supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })

    const { count: usuarioCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })

    const { count: mesaCount } = await supabase
      .from('mesas')
      .select('*', { count: 'exact', head: true })

    statusDiv.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="padding:12px;background:#f0f0f0;border-radius:4px;text-align:center;">
          <div style="font-weight:bold;font-size:24px;">${partidoCount || 0}</div>
          <small>Partidos</small>
        </div>
        <div style="padding:12px;background:#f0f0f0;border-radius:4px;text-align:center;">
          <div style="font-weight:bold;font-size:24px;">${usuarioCount || 0}</div>
          <small>Usuarios</small>
        </div>
        <div style="padding:12px;background:#f0f0f0;border-radius:4px;text-align:center;">
          <div style="font-weight:bold;font-size:24px;">${mesaCount || 0}</div>
          <small>Mesas</small>
        </div>
      </div>
    `
  }
}

export default createSystemConfig
