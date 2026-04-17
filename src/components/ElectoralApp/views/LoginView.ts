/**
 * LoginView: Vista de autenticación de usuarios
 * Responsabilidades:
 * - Renderizar formulario de login
 * - Validar credenciales contra Supabase Auth
 * - Verificar rol del usuario en tabla usuarios
 * - Navegar según rol
 *
 * Máx 250 líneas (dentro del límite)
 */

import { supabase } from '../../../utils/supabase'
import { type RoleId, type RouteId } from '../shared/types'

interface LoginViewProps {
  onNavigate: (route: RouteId) => void
}

export async function createLoginView({ onNavigate }: LoginViewProps): Promise<HTMLElement> {
  const container = document.createElement('div')
  container.innerHTML = getLoginTemplate()

  // Bind event listeners
  await bindLoginForm(container, onNavigate)

  return container
}

function getLoginTemplate(): string {
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

        <!-- Ayuda para desarrollo -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0cce6; font-size: 13px; color: #888;">
          <p style="font-weight: 600; color: #666; margin-bottom: 8px;">💡 Credenciales de prueba:</p>
          <p>admin@electoral.test / Admin123456!</p>
          <p>supervisor.distrito@electoral.test / Supervisor123!</p>
          <p>supervisor.recinto@electoral.test / Supervisor123!</p>
          <p>veedor@electoral.test / Veedor123!</p>
          <p>lector@electoral.test / Lector123!</p>
        </div>
      </article>
    </section>
  `
}

async function bindLoginForm(container: HTMLElement, onNavigate: (route: RouteId) => void) {
  const form = container.querySelector<HTMLFormElement>('#login-form')
  if (!form) return

  // States

  const showError = (message: string) => {
    let errorDiv = container.querySelector<HTMLDivElement>('#login-error')
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
    const errorDiv = container.querySelector<HTMLDivElement>('#login-error')
    if (errorDiv) errorDiv.style.display = 'none'
  }

  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const userField = container.querySelector<HTMLInputElement>('#user')
    const passField = container.querySelector<HTMLInputElement>('#pass')
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
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
        onNavigate('home')
      } else if (rol === 'lector') {
        onNavigate('carrasco')
      } else {
        onNavigate('panel')
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

  // Volver al inicio
  const backBtn = form.querySelector<HTMLButtonElement>('button[data-go="/"]')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      onNavigate('home')
    })
  }
}

export default createLoginView
