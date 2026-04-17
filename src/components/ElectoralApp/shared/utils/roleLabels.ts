/**
 * Utilidades compartidas para roles y etiquetas
 */
import { type RoleId } from '../types'

export function getRoleLabel(role: RoleId | null): string {
  if (role === 'admin') return 'Administrador'
  if (role === 'distrito') return 'Supervisor de Distrito'
  if (role === 'colegio') return 'Responsable de Colegio'
  if (role === 'veedor') return 'Veedor'
  if (role === 'lector') return 'Lector Electoral'
  return 'Invitado'
}

export function getSupervisorDistrict(): string {
  const role = window.localStorage.getItem('authRole') as RoleId | null
  if (role === 'distrito') return 'Distrito 01'
  if (role === 'admin') return 'Distrito 01'
  return ''
}

export function getRoleColor(role: RoleId | null): string {
  const colorMap: Record<RoleId, string> = {
    admin: '#dc3545',
    distrito: '#007bff',
    colegio: '#28a745',
    veedor: '#ffc107',
    lector: '#6f42c1',
  }
  return role ? colorMap[role] : '#999'
}

export function getRoleIcon(role: RoleId | null): string {
  const iconMap: Record<RoleId, string> = {
    admin: '🔐',
    distrito: '🗺️',
    colegio: '🏫',
    veedor: '📋',
    lector: '📊',
  }
  return role ? iconMap[role] : '?'
}
