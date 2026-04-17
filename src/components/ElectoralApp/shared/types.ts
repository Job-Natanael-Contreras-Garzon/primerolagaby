/**
 * Tipos globales compartidos entre todos los roles y componentes
 */

// ─── TIPOS DE AUTENTICACIÓN Y ROLES ─────────────────────────────────────
export type RouteId = 'home' | 'login' | 'panel' | 'admin' | 'carrasco'
export type RoleId = 'veedor' | 'distrito' | 'colegio' | 'admin' | 'lector'

// ─── TIPOS DE ENTIDADES DE NEGOCIO ───────────────────────────────────────
export interface Colegio {
  nombre: string
  distrito: string
  recinto_id?: number
}

export interface Partido {
  id: number
  nombre: string
  sigla: string
  color: string
}

export interface Cargo {
  id: number
  nombre: string
}

export interface Candidato {
  id: number
  nombre: string
  partido_id: number
  cargo_id: number
}

export interface Mesa {
  id: number
  numero: string
  colegio: string
  distrito: string
  estado: string
}

export interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  rol: RoleId
  activo: boolean
  recinto_id?: number
  distrito_id?: number
}

export interface Distrito {
  id: number
  nombre: string
  numero_distrito: number
  activo: boolean
}

export interface Recinto {
  id: number
  nombre: string
  direccion?: string
  distrito_id: number
  activo: boolean
}

export interface Transmision {
  id: number
  mesa_id: number
  usuario_id?: string
  imagen_acta_url?: string
  es_valida: boolean
  created_at: string
}

export interface ResultadoTransmision {
  id: number
  transmision_id: number
  partido_id: number
  votos_obtenidos: number
  tipo_cargo: string
}

export interface Incidencia {
  id: number
  mesa_id: number
  usuario_id?: string
  justificativo: string
  estado: 'pendiente' | 'resuelto'
  created_at: string
}

// ─── TIPOS DE ESTADOS DE COMPONENTES ────────────────────────────────────
export interface AppContextType {
  role: RoleId | null
  user: Usuario | null
  isLoading: boolean
  error: string | null
}

export interface ViewProps {
  role: RoleId
  onNavigate?: (route: RouteId) => void
  onLogout?: () => void
}

// ─── TIPOS PARA DATOS GLOBALES ──────────────────────────────────────────
export interface CatalogosData {
  colegios: Colegio[]
  partidos: Partido[]
  cargos: Cargo[]
  candidatos: Candidato[]
  mesas: Mesa[]
}
