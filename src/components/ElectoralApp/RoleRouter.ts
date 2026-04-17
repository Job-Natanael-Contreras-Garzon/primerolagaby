/**
 * RoleRouter: Enrutador central basado en rol y ruta
 * Mapea combinaciones de (route, role) → vista correspondiente
 * Única responsabilidad: decidir qué vista renderizar
 *
 * Máx 60 líneas
 */

import { createLoginView } from './views/LoginView'
import { createVeedorView } from './views/VeedorView'
import { createLectorView } from './views/LectorView'
import { createColegioView } from './views/ColegioView'
import { createDistritoView } from './views/DistritoView'
import { createAdminView } from './views/AdminView'

export type RouteId = 'login' | 'home' | 'panel' | 'carrasco' | 'admin'
export type RoleId = 'veedor' | 'lector' | 'colegio' | 'distrito' | 'admin'

interface RouterProps {
  route: RouteId
  role: RoleId
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

/**
 * Renderiza la vista correcta según rol + ruta
 * Retorna null si la combinación es inválida
 */
export async function renderRole(props: RouterProps): Promise<HTMLElement | null> {
  const { route, role, onNavigate, onLogout } = props

  // Login: accesible para todos
  if (route === 'login') {
    return await createLoginView({ onNavigate })
  }

  // Home (veedor)
  if (route === 'home' && role === 'veedor') {
    return await createVeedorView({ onNavigate, onLogout })
  }

  // Panel (distrito/colegio)
  if (route === 'panel') {
    if (role === 'colegio') {
      return await createColegioView({ onNavigate, onLogout })
    }
    if (role === 'distrito') {
      return await createDistritoView({ role: 'distrito', onNavigate, onLogout })
    }
    if (role === 'admin') {
      return await createDistritoView({ role: 'admin', onNavigate, onLogout })
    }
  }

  // Admin
  if (route === 'admin' && role === 'admin') {
    return await createAdminView({ onNavigate, onLogout })
  }

  // Monitor (carrasco = lector)
  if (route === 'carrasco' && role === 'lector') {
    return await createLectorView({ onNavigate, onLogout })
  }

  console.warn(`[RoleRouter] Ruta inválida: route=${route}, role=${role}`)
  return null
}

export default renderRole
