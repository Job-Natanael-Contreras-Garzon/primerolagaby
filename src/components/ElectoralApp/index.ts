/**
 * Punto de entrada del modulo ElectoralApp.
 * Mantiene compatibilidad para imports existentes delegando al RoleRouter real.
 */

export { renderRole as default, renderRole } from './RoleRouter'
export type { RouteId, RoleId } from './RoleRouter'
