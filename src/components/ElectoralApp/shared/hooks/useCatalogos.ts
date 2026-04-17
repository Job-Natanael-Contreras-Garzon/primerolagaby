/**
 * Hook reutilizable para cargar todos los catálogos desde Supabase
 */
import { supabase } from '../../../../utils/supabase'
import { type CatalogosData, type Colegio, type Partido, type Cargo, type Candidato, type Mesa } from '../types'

// Estados globales mantenidos en memoria
let catalogosCached: CatalogosData | null = null

const defaultCargos: Cargo[] = [
  { id: 1, nombre: 'Alcalde' },
  { id: 2, nombre: 'Concejal' },
]

export async function useCatalogos(): Promise<CatalogosData> {
  // Retornar caché si ya fue cargado
  if (catalogosCached) {
    return catalogosCached
  }

  const colegios: Colegio[] = []
  const partidos: Partido[] = []
  const candidatos: Candidato[] = []
  const mesas: Mesa[] = []

  try {
    // Cargar recintos con su distrito
    const { data: recintos, error: rErr } = await supabase
      .from('recintos')
      .select('id, nombre, distritos(nombre)')
      .eq('activo', true)

    if (rErr) throw rErr

    if (recintos) {
      colegios.push(
        ...recintos.map((r: any) => ({
          nombre: r.nombre,
          distrito: r.distritos?.nombre ?? 'Sin distrito',
          recinto_id: r.id,
        }))
      )
    }

    // Cargar partidos
    const { data: partData, error: pErr } = await supabase
      .from('partidos')
      .select('id, nombre, sigla, color_hex')
      .eq('activo', true)

    if (pErr) throw pErr

    if (partData) {
      partidos.push(
        ...partData.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          sigla: p.sigla,
          color: p.color_hex ?? '#888888',
        }))
      )
    }

    // Cargar mesas activas
    const { data: mesasData, error: mErr } = await supabase
      .from('mesas')
      .select('id, numero_mesa, estado, recintos(nombre, distritos(nombre))')
      .eq('activo', true)

    if (mErr) throw mErr

    if (mesasData) {
      mesas.push(
        ...mesasData.map((m: any) => ({
          id: m.id,
          numero: m.numero_mesa,
          colegio: m.recintos?.nombre ?? 'Sin recinto',
          distrito: m.recintos?.distritos?.nombre ?? 'Sin distrito',
          estado: m.estado,
        }))
      )
    }

    // Generar candidatos como combinación de partidos × cargos
    let cid = 1
    partidos.forEach((p) => {
      defaultCargos.forEach((c) => {
        candidatos.push({
          id: cid++,
          nombre: `Candidato ${p.sigla}`,
          partido_id: p.id,
          cargo_id: c.id,
        })
      })
    })

    // Guardar en caché
    catalogosCached = {
      colegios,
      partidos,
      cargos: defaultCargos,
      candidatos,
      mesas,
    }

    return catalogosCached
  } catch (err) {
    console.error('[useCatalogos] Error cargando catálogos:', err)
    // Retornar estructura vacía como fallback
    return {
      colegios: [],
      partidos: [],
      cargos: defaultCargos,
      candidatos: [],
      mesas: [],
    }
  }
}

export function invalidateCatalogosCache(): void {
  catalogosCached = null
}

export function getCachedCatalogos(): CatalogosData | null {
  return catalogosCached
}
