import { supabase } from '../../../utils/supabase'

interface DistritoManagementProps {
  catalogos: any
  supabase: any
}

export async function createDistritoManagement(_props: DistritoManagementProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-distrito-form">
        <h3 style="margin:0;">➕ Crear Nuevo Distrito</h3>
        <span id="distrito-form-icon">▼</span>
      </div>
      <form id="admin-form-distrito" class="form-grid" style="margin-top: 12px; display:none;">
        <label for="admin-dist-nombre">Nombre</label>
        <input id="admin-dist-nombre" type="text" required />
        
        <label for="admin-dist-numero">Número</label>
        <input id="admin-dist-numero" type="number" required />
        
        <button class="cta" type="submit" style="grid-column: 1 / -1;">Crear Distrito</button>
      </form>
    </article>

    <article class="card">
      <h3>📋 Listado de Distritos</h3>
      <input type="text" id="admin-search-distritos" placeholder="🔍 Buscar por nombre o número..." style="width:100%;padding:8px;margin-bottom:12px;border:1px solid #ddd;border-radius:4px;" />
      <div id="admin-distritos-list" class="distritos-list" style="margin-top: 16px;"></div>
    </article>
  `

  await bindDistritoManagement(container)

  return container
}

async function bindDistritoManagement(container: HTMLElement) {
  const form = container.querySelector<HTMLFormElement>('#admin-form-distrito')
  const distritosList = container.querySelector<HTMLElement>('#admin-distritos-list')
  const searchInput = container.querySelector<HTMLInputElement>('#admin-search-distritos')

  const toggleHeader = container.querySelector<HTMLElement>('#toggle-distrito-form')
  const formIcon = container.querySelector<HTMLElement>('#distrito-form-icon')

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

  const loadDistritos = async (searchTerm: string = '') => {
    if (!distritosList) return
    distritosList.innerHTML = '<p style="color:#aaa;">Cargando...</p>'

    let query = supabase.from('distritos').select('id, nombre, numero_distrito, activo').order('numero_distrito')

    if (searchTerm) {
      query = query.ilike('nombre', `%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error || !data) {
      distritosList.innerHTML = '<p style="color:red;">Error al cargar distritos: ' + (error?.message || 'Error') + '</p>'
      return
    }

    if (data.length === 0) {
      distritosList.innerHTML = '<p style="color:#777;">No hay distritos.</p>'
      return
    }

    distritosList.innerHTML = data
      .map(
        (dist: any) => `
      <div class="user-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
        <div>
          <strong>Distrito ${dist.numero_distrito || 'S/N'}: ${dist.nombre}</strong>
          <span style="margin-left:8px; padding:2px 6px; border-radius:12px; font-size:12px; background:${dist.activo ? '#e6f4ea; color:#1e8e3e' : '#fce8e6; color:#d93025'}">
            ${dist.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="ghost-btn toggle-dist-btn" data-id="${dist.id}" data-activo="${dist.activo}">
            ${dist.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    `
      )
      .join('')

    // Bind event listeners for toggle
    const toggleBtns = distritosList.querySelectorAll('.toggle-dist-btn')
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLButtonElement
        const distId = target.dataset.id
        const currentMesaActivo = target.dataset.activo === 'true'
        
        if (!distId) return

        if (!confirm(`¿Seguro que desea ${currentMesaActivo ? 'desactivar' : 'activar'} este distrito?`)) return
        
        const { error } = await supabase
          .from('distritos')
          .update({ activo: !currentMesaActivo })
          .eq('id', distId)

        if (error) {
          alert('Error al actualizar estado del distrito: ' + error.message)
        } else {
          loadDistritos(searchInput?.value || '')
        }
      })
    })
  }

  // Load initially
  loadDistritos()

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      loadDistritos(target.value)
    })
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const nombreInput = form.querySelector<HTMLInputElement>('#admin-dist-nombre')
      const numeroInput = form.querySelector<HTMLInputElement>('#admin-dist-numero')
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement

      if (!nombreInput || !numeroInput || !submitBtn) return

      submitBtn.disabled = true
      submitBtn.textContent = 'Creando...'

      try {
        const { error } = await supabase.from('distritos').insert({
          nombre: nombreInput.value.trim(),
          numero_distrito: parseInt(numeroInput.value),
          activo: true
        })

        if (error) throw error

        alert('Distrito creado exitosamente')
        form.reset()
        loadDistritos(searchInput?.value || '')
      } catch (err: any) {
        alert('Error al crear distrito: ' + (err.message || err))
      } finally {
        submitBtn.disabled = false
        submitBtn.textContent = 'Crear Distrito'
      }
    })
  }
}
