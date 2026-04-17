/**
 * UserManagement: Gestión de usuarios del sistema
 * - Crear usuario
 * - Listar y editar
 * - Exportar/importar Excel
 * 
 * Máx 200 líneas
 */

import { supabase } from '../../../utils/supabase'

interface UserManagementProps {
  catalogos: any
  supabase: any
}

export async function createUserManagement({ catalogos: _catalogos }: UserManagementProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-usuario-form">
        <h3 style="margin:0;">➕ Crear Nuevo Usuario</h3>
        <span id="usuario-form-icon">▼</span>
      </div>
      <form id="admin-form-usuario" class="form-grid" style="margin-top: 12px; display:none;">
        <label for="admin-user-nombre">Nombre</label>
        <input id="admin-user-nombre" type="text" required />
        
        <label for="admin-user-apellido">Apellido</label>
        <input id="admin-user-apellido" type="text" required />

        <label for="admin-user-email">Email</label>
        <input id="admin-user-email" type="email" required />

        <label for="admin-user-rol">Rol</label>
        <select id="admin-user-rol" required>
          <option value="">Selecciona un rol</option>
          <option value="admin">Administrador</option>
          <option value="distrito">Supervisor de Distrito</option>
          <option value="colegio">Responsable de Colegio</option>
          <option value="veedor">Delegado / Veedor</option>
          <option value="lector">Lector Electoral</option>
        </select>
        
        <button class="cta" type="submit" style="grid-column: 1 / -1;">Crear Usuario</button>
      </form>
    </article>

    <article class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3>👥 Listado de Usuarios</h3>
        <div style="display:flex; gap:8px;">
          <button id="btn-export-usuarios" class="ghost-btn" style="padding:4px 8px; font-size:12px;">📥 Exportar</button>
        </div>
      </div>
      <div id="admin-usuarios-list" class="usuarios-list" style="margin-top: 8px;"></div>
    </article>
  `

  await bindUserManagement(container)

  return container
}

async function bindUserManagement(container: HTMLElement) {
  const form = container.querySelector<HTMLFormElement>('#admin-form-usuario')
  const usuariosList = container.querySelector<HTMLElement>('#admin-usuarios-list')

  const toggleHeader = container.querySelector<HTMLElement>('#toggle-usuario-form')
  const formIcon = container.querySelector<HTMLElement>('#usuario-form-icon')

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

  // Crear usuario
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nombre = (container.querySelector<HTMLInputElement>('#admin-user-nombre')?.value || '').trim()
      const apellido = (container.querySelector<HTMLInputElement>('#admin-user-apellido')?.value || '').trim()
      const email = (container.querySelector<HTMLInputElement>('#admin-user-email')?.value || '').trim()
      const rol = container.querySelector<HTMLSelectElement>('#admin-user-rol')?.value || ''

      if (!nombre || !apellido || !email || !rol) {
        alert('Completa todos los campos')
        return
      }

      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Creando...'
      }

      try {
        // Crear mediante Edge Function para evitar usar el service_role key en el frontend
        const password = Math.random().toString(36).slice(2, 10) + 'A1!'
        
        const { data, error: fnError } = await supabase.functions.invoke('create-user', {
          body: {
            email,
            password,
            nombre,
            apellido,
            rol,
          },
        })

        if (fnError || data?.error) {
          throw new Error(fnError?.message || data?.error || 'Error al crear usuario')
        }

        alert(`✅ Usuario creado.\nLa contraseña temporal es: ${password}\nPor favor, anótela y entréguela aseguradamente al usuario.`)
        form.reset()
        loadUsuarios()
      } catch (err: any) {
        alert(`❌ Error: ${err.message || err}`)
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Crear Usuario'
        }
      }
    })
  }

  const loadUsuarios = async () => {
    if (!usuariosList) return
    usuariosList.innerHTML = '<p style="color:#aaa;">Cargando...</p>'

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo')
      .eq('activo', true)
      .order('nombre')
      .limit(50)

    if (error || !data) {
      usuariosList.innerHTML = '<p style="color:#c00;">Error cargando usuarios</p>'
      return
    }

    if (data.length === 0) {
      usuariosList.innerHTML = '<p class="empty">No hay usuarios</p>'
      return
    }

    usuariosList.innerHTML = data
      .map(
        (u: any) => `<div class="mesa-item" style="justify-content:space-between;">
        <div class="mesa-info">
          <strong>${u.nombre} ${u.apellido}</strong>
          <span>${u.email}</span>
          <small>${u.rol}</small>
        </div>
        <button class="btn-delete-user" data-id="${u.id}" style="background:#dc3545;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Desactivar</button>
      </div>`
      )
      .join('')

    // Desactivar usuario
    usuariosList.querySelectorAll<HTMLButtonElement>('.btn-delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id as string)
        btn.disabled = true
        await supabase.from('usuarios').update({ activo: false }).eq('id', id)
        loadUsuarios()
      })
    })
  }

  // Cargar inicial
  loadUsuarios()

  // Export/Import (placeholder)
  const btnExport = container.querySelector<HTMLButtonElement>('#btn-export-usuarios')
  const btnImport = container.querySelector<HTMLButtonElement>('#btn-import-usuarios')

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      alert('📥 Exportar Excel (por implementar)')
    })
  }

  if (btnImport) {
    btnImport.addEventListener('click', () => {
      alert('📤 Importar Excel (por implementar)')
    })
  }
}

export default createUserManagement
