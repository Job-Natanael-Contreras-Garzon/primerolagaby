import { supabase } from '../../../utils/supabase'

interface RecintoManagementProps {
  catalogos: any
  supabase: any
}

export async function createRecintoManagement(_props: RecintoManagementProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-recinto-form">
        <h3 style="margin:0;">➕ Crear Nuevo Recinto</h3>
        <span id="recinto-form-icon">▼</span>
      </div>
      <form id="admin-form-recinto" class="form-grid" style="margin-top: 12px; display:none;">
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
      <input type="text" id="admin-search-recintos" placeholder="🔍 Buscar por nombre o dirección..." style="width:100%;padding:8px;margin-bottom:12px;border:1px solid #ddd;border-radius:4px;" />
      <div id="admin-recintos-list" class="recintos-list" style="margin-top: 16px;"></div>
    </article>
  `

  await bindRecintoManagement(container)

  return container
}

async function bindRecintoManagement(container: HTMLElement) {
  const form = container.querySelector<HTMLFormElement>('#admin-form-recinto')
  const recintosList = container.querySelector<HTMLElement>('#admin-recintos-list')
  const searchInput = container.querySelector<HTMLInputElement>('#admin-search-recintos')
  const distSelect = container.querySelector<HTMLSelectElement>('#admin-rec-distrito')

  const toggleHeader = container.querySelector<HTMLElement>('#toggle-recinto-form')
  const formIcon = container.querySelector<HTMLElement>('#recinto-form-icon')

  if (toggleHeader && form && formIcon) {
    toggleHeader.addEventListener('click', () => {
      if (form.style.display === 'none') {
        form.style.display = 'grid'
        formIcon.textContent = '▲'
      } else {
        form.style.display = 'none'
        formIcon.textContent = '▼'
      }
    })
  }

  // Cargar distritos
  if (distSelect) {
    const { data: distritos } = await supabase.from('distritos').select('id, nombre').eq('activo', true)
    if (distritos) {
      distritos.forEach((d: any) => {
        const opt = document.createElement('option')
        opt.value = d.id
        opt.textContent = d.nombre
        distSelect.appendChild(opt)
      })
    }
  }

  const loadRecintos = async (searchTerm: string = '') => {
    if (!recintosList) return
    recintosList.innerHTML = '<p style="color:#aaa;">Cargando...</p>'

    const { data, error } = await supabase
      .from('recintos')
      .select('id, nombre, direccion, activo, distrito_id, distritos(nombre)')
      .order('nombre')

    if (error || !data) {
      recintosList.innerHTML = '<p style="color:red;">Error al cargar recintos</p>'
      return
    }

    let filtered = data
    if (searchTerm) {
      filtered = data.filter((r: any) => 
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (r.direccion && r.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filtered.length === 0) {
      recintosList.innerHTML = '<p style="color:#777;">No hay recintos registrados.</p>'
      return
    }

    recintosList.innerHTML = filtered
      .map(
        (rec: any) => `
      <div class="user-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
        <div>
          <strong>${rec.nombre}</strong> <span style="color:#999;font-size:12px;">(Distrito: ${rec.distritos?.nombre || 'S/D'})</span>
          <br/>
          <small>${rec.direccion || 'Sin dirección registrada'}</small>
          <span style="margin-left:8px; padding:2px 6px; border-radius:12px; font-size:12px; background:${rec.activo !== false ? '#e6f4ea; color:#1e8e3e' : '#fce8e6; color:#d93025'}">
            ${rec.activo !== false ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="ghost-btn toggle-recinto-btn" data-id="${rec.id}" data-activo="${rec.activo !== false}">
            ${rec.activo !== false ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    `
      )
      .join('')

    // Manejar desactivación
    const toggleBtns = recintosList.querySelectorAll('.toggle-recinto-btn')
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLButtonElement
        const recintoId = target.dataset.id
        const isActivo = target.dataset.activo === 'true'
        
        if (!recintoId) return

        if (!confirm(`¿Seguro que desea ${isActivo ? 'desactivar' : 'activar'} este recinto?`)) return
        
        const { error } = await supabase
          .from('recintos')
          .update({ activo: !isActivo })
          .eq('id', recintoId)

        if (error) {
          alert('Error al actualizar estado: ' + error.message)
        } else {
          loadRecintos(searchInput?.value || '')
        }
      })
    })
  }

  // Load initially
  loadRecintos()

  // Búsqueda
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      loadRecintos(target.value)
    })
  }

  // Creación
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const nombreInput = form.querySelector<HTMLInputElement>('#admin-rec-nombre')
      const distritoSelect = form.querySelector<HTMLSelectElement>('#admin-rec-distrito')
      const dirInput = form.querySelector<HTMLInputElement>('#admin-rec-direccion')
      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')

      if (!nombreInput || !distritoSelect || !submitBtn) return

      const nombre = nombreInput.value.trim()
      const distrito_id = distritoSelect.value
      const direccion = dirInput ? dirInput.value.trim() : null

      if (!nombre || !distrito_id) {
        alert('Por favor complete los campos obligatorios.')
        return
      }

      submitBtn.disabled = true
      submitBtn.textContent = 'Creando...'

      try {
        const { error } = await supabase.from('recintos').insert({
          nombre,
          distrito_id,
          direccion,
          activo: true
        })

        if (error) throw error

        alert('Recinto creado exitosamente')
        form.reset()
        loadRecintos(searchInput?.value || '')
      } catch (err: any) {
        alert('Error al crear: ' + (err.message || err))
      } finally {
        submitBtn.disabled = false
        submitBtn.textContent = 'Crear Recinto'
      }
    })
  }
}
