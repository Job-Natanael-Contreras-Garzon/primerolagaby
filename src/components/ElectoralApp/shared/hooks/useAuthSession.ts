/**
 * Hook reutilizable para gestionar autenticación y sesión
 */
import { supabase } from '../../../../utils/supabase'
import { type RoleId } from '../types'

export async function useAuthSession(): Promise<{
  isLoggedIn: boolean
  role: RoleId | null
  user: any | null
}> {
  // Obtener sesión actual de Supabase Auth
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData?.session?.user) {
    window.localStorage.removeItem('authRole')
    return { isLoggedIn: false, role: null, user: null }
  }

  // Validar que el usuario tenga rol en la tabla usuarios
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_id', sessionData.session.user.id)
    .eq('activo', true)
    .single()

  if (!userData) {
    window.localStorage.removeItem('authRole')
    await supabase.auth.signOut()
    return { isLoggedIn: false, role: null, user: null }
  }

  // Sesión válida
  const role = userData.rol as RoleId
  window.localStorage.setItem('authRole', role)
  return { isLoggedIn: true, role, user: sessionData.session.user }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  window.localStorage.removeItem('authRole')
}

export function getStoredRole(): RoleId | null {
  return window.localStorage.getItem('authRole') as RoleId | null
}
