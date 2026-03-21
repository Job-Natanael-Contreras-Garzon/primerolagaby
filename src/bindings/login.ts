/**
 * Binding para Login
 */

import { supabase } from '../utils/supabase'

export async function bindLogin(): Promise<void> {
  const form = document.querySelector<HTMLFormElement>('#login-form')
  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const emailField = document.querySelector<HTMLInputElement>('#user')
    const passwordField = document.querySelector<HTMLInputElement>('#pass')
    const email = emailField?.value?.trim() || ''
    const password = passwordField?.value || ''

    if (!email || !password) {
      alert('Por favor ingresa email y contraseña')
      return
    }

    try {
      // Autenticar en Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        alert(`❌ Error de autenticación: ${authError.message}`)
        return
      }

      if (!authData.user) {
        alert('❌ No se pudo autenticar')
        return
      }

      // Guardar sesión
      window.localStorage.setItem('authUser', JSON.stringify({
        id: authData.user.id,
        email: authData.user.email,
      }))

      // Obtener rol del usuario
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('rol, activo')
        .eq('auth_id', authData.user.id)
        .eq('activo', true)
        .single()

      if (usuarioError || !usuarioData) {
        alert('❌ Usuario no encontrado o inactivo')
        return
      }

      // Guardar rol
      window.localStorage.setItem('authRole', usuarioData.rol)

      console.log(`✅ [Login] Usuario autenticado: ${email} (${usuarioData.rol})`)

      // Redirigir según rol
      const rol = usuarioData.rol
      if (rol === 'lector') {
        window.history.pushState({}, '', '/carrasco')
      } else if (rol === 'veedor') {
        window.history.pushState({}, '', '/')
      } else {
        window.history.pushState({}, '', '/panel')
      }

      // Disparar evento de renderizado
      window.dispatchEvent(new Event('routechange'))
    } catch (error) {
      console.error('❌ Error login:', error)
      alert('Error inesperado. Intenta de nuevo.')
    }
  })
}
