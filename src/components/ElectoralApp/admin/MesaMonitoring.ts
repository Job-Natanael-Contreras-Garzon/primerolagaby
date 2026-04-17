import { supabase } from '../../../utils/supabase'

interface MesaMonitoringProps {
  catalogos?: any
}

export async function createMesaMonitoring(_props?: MesaMonitoringProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <h3 id="toggle-mesa-search" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
        🔍 Buscar Mesa
        <span id="mesa-search-icon">🔽</span>
      </h3>
      <form id="admin-form-mesa-search" style="display: none; gap: 12px; margin-top: 16px;">
        <label for="admin-search-mesa-numero">Número de Mesa</label>
        <input id="admin-search-mesa-numero" type="number" placeholder="Ej: 001" />
        
        <label for="admin-search-colegio">Recinto</label>
        <select id="admin-search-colegio">
          <option value="">Todos</option>
        </select>
        
        <button class="cta" type="submit">Buscar</button>
      </form>
    </article>

    <article class="card">
      <h3>📊 Resultados</h3>
      <div id="admin-mesas-results" class="mesas-list" style="margin-top: 16px;"></div>
    </article>
  `

  await bindMesaMonitoring(container)

  return container
}

async function bindMesaMonitoring(container: HTMLElement) {
  const toggleSearch = container.querySelector<HTMLElement>('#toggle-mesa-search')
  const searchIcon = container.querySelector<HTMLElement>('#mesa-search-icon')
  const form = container.querySelector<HTMLFormElement>('#admin-form-mesa-search')
  const resultsDiv = container.querySelector<HTMLElement>('#admin-mesas-results')
  const searchMesa = container.querySelector<HTMLInputElement>('#admin-search-mesa-numero')
  const searchColegio = container.querySelector<HTMLSelectElement>('#admin-search-colegio')

  if (toggleSearch && form && searchIcon) {
    toggleSearch.addEventListener('click', () => {
      const isHidden = form.style.display === 'none'
      form.style.display = isHidden ? 'grid' : 'none'
      searchIcon.textContent = isHidden ? '🔼' : '🔽'
    })
  }

  // Cargar colegios
  if (searchColegio) {
    const { data: colegios } = await supabase.from('recintos').select('id, nombre').eq('activo', true).order('nombre')
    if (colegios) {
      colegios.forEach((c: any) => {
        const opt = document.createElement('option')
        opt.value = c.id
        opt.textContent = c.nombre
        searchColegio.appendChild(opt)
      })
    }
  }

  const showResults = async (numero?: string, colegioId?: string) => {
    if (!resultsDiv) return
    resultsDiv.innerHTML = '<p style="color:#aaa;">Cargando...</p>'

    let query = supabase
      .from('mesas')
      .select(`
        id, numero:numero_mesa, colegio_id:recinto_id, estado, activo,
        recintos(nombre, distrito_id),
        transmisiones(id, imagen_acta_url)
      `)
      .order('numero_mesa')

    if (numero) {
      const numPadded = numero.toString().padStart(3, '0')
      query = query.ilike('numero_mesa', `%${numPadded}%`)
    }

    if (colegioId) {
      query = query.eq('recinto_id', colegioId)
    }

    const { data: mesasData, error } = await query

    if (error) {
      resultsDiv.innerHTML = '<p style="color:red;">Error al buscar mesas: ' + error.message + '</p>'
      return
    }

    if (!mesasData || mesasData.length === 0) {
      resultsDiv.innerHTML = '<p style="color:#777;">No se encontraron mesas con esos criterios.</p>'
      return
    }

    // Render mesas
    resultsDiv.innerHTML = mesasData.map((mesa: any) => {
      const trans = mesa.transmisiones && mesa.transmisiones.length > 0 ? mesa.transmisiones[0] : null
      const statusBadge = trans 
        ? '<span style="background:#e6f4ea; color:#1e8e3e; padding:4px 8px; border-radius:12px; font-size:12px;">✅ Transmitida</span>'
        : '<span style="background:#fce8e6; color:#d93025; padding:4px 8px; border-radius:12px; font-size:12px;">❌ Pendiente</span>'
        
      return `
        <div class="user-item" style="padding:16px; border-bottom:1px solid #ddd; margin-bottom:8px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>Mesa ${mesa.numero}</strong>
              <span style="margin-left:8px; padding:2px 6px; border-radius:12px; font-size:12px; background:${mesa.activo !== false ? '#e6f4ea; color:#1e8e3e' : '#fce8e6; color:#d93025'}">
                ${mesa.activo !== false ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            ${statusBadge}
          </div>
          <div style="color:#666; font-size:14px;">
            Colegio: ${mesa.recintos?.nombre || 'S/D'} (Distrito: ${mesa.recintos?.distrito_id || 'S/D'})
          </div>
          ${trans ? `
            <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-top:8px;">
              <h5 style="margin:0 0 8px 0; color:#333;">Detalle de Transmisión:</h5>
              <p style="margin:0; font-size:13px; color:#555;">Transmisión registrada</p>
              ${trans.imagen_acta_url ? `<a href="${trans.imagen_acta_url}" target="_blank" style="display:inline-block; margin-top:8px; color:#1a73e8; text-decoration:none; font-size:13px;">Ver Acta Original ↗</a>` : ''}
            </div>
            <div style="margin-top:8px; display:flex; gap:8px;">
              <button class="ghost-btn toggle-revision-btn" data-id="${trans.id}">Marcar Revisión</button>
            </div>
          ` : `
            <div style="padding:12px; background:#fff3cd; border:1px solid #ffeeba; border-radius:8px; margin-top:8px; color:#856404; font-size:13px;">
              Esperando transmisión de datos del delegado de mesa.
            </div>
          `}
          <div style="margin-top:8px;">
            <button class="ghost-btn toggle-mesa-btn" data-id="${mesa.id}" data-activo="${mesa.activo !== false}">
              ${mesa.activo !== false ? 'Desactivar Mesa' : 'Activar Mesa'}
            </button>
          </div>
        </div>
      `
    }).join('')

    const toggleBtns = resultsDiv.querySelectorAll('.toggle-mesa-btn')
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLButtonElement
        const mesaId = target.dataset.id
        const isActivo = target.dataset.activo === 'true'
        
        if (!mesaId) return

        if (!confirm(`¿Seguro que desea ${isActivo ? 'desactivar' : 'activar'} esta mesa?`)) return

        const { error } = await supabase
          .from('mesas')
          .update({ activo: !isActivo })
          .eq('id', mesaId)

        if (error) {
          alert('Error al actualizar estado: ' + error.message)
        } else {
          showResults(searchMesa?.value.trim(), searchColegio?.value)
        }
      })
    })

    const revisionBtns = resultsDiv.querySelectorAll('.toggle-revision-btn')
    revisionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement
        const transId = target.dataset.id
        if (transId) {
          alert(`Módulo de revisión de transmisión ${transId} en construcción.`)
        }
      })
    })
  }

  // Load initial all mesas
  showResults()

  // Form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const numero = searchMesa ? searchMesa.value.trim() : ''
      const colegio = searchColegio ? searchColegio.value : ''
      showResults(numero, colegio)
    })
  }
}
