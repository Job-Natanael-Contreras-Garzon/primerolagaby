/**
 * AdminDashboard: Vista principal de estadísticas
 * Muestra:
 * - Estadísticas en tarjetas (usuarios, distritos, mesas, transmisiones)
 * - Gráfico de votos por partido
 * - Incidencias pendientes
 *
 * Máx 200 líneas
 */

import { supabase } from '../../../utils/supabase'

interface AdminDashboardProps {
  catalogos: any
}

export async function createAdminDashboard({ catalogos }: AdminDashboardProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = getDashboardTemplate()

  await bindDashboard(container, catalogos)

  return container
}

function getDashboardTemplate(): string {
  return `
    <article class="card">
      <h3>📊 Dashboard General</h3>
      <p>Estadísticas en tiempo real del sistema electoral</p>
      
      <div class="stats-grid" id="admin-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px;">
        <!-- Stats se cargarán dinámicamente -->
      </div>
    </article>

    <article class="card">
      <h3>📈 Gráfica General de Votos</h3>
      <div id="admin-pie-chart" style="width:100%;height:350px;"></div>
    </article>

    <article class="card">
      <h3>🔴 Incidencias Pendientes</h3>
      <div id="admin-incidencias-list" class="mesas-list"></div>
    </article>
  `
}

async function bindDashboard(container: HTMLElement, _catalogos: any) {
  const statsGrid = container.querySelector<HTMLElement>('#admin-stats-grid')

  if (statsGrid) {
    // Cargar estadísticas
    const [usuarios, distritos, mesas, transmisiones] = await Promise.all([
      supabase.from('usuarios').select('id', { count: 'exact' }).eq('activo', true),
      supabase.from('distritos').select('id', { count: 'exact' }).eq('activo', true),
      supabase.from('mesas').select('id', { count: 'exact' }).eq('activo', true),
      supabase.from('transmisiones').select('id', { count: 'exact' }),
    ])

    statsGrid.innerHTML = `
      <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
        <div style="font-size:28px;font-weight:bold;color:#007bff;">${usuarios.count || 0}</div>
        <div style="font-size:12px;color:#666;">Usuarios</div>
      </div>
      <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
        <div style="font-size:28px;font-weight:bold;color:#28a745;">${distritos.count || 0}</div>
        <div style="font-size:12px;color:#666;">Distritos</div>
      </div>
      <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
        <div style="font-size:28px;font-weight:bold;color:#ffc107;">${mesas.count || 0}</div>
        <div style="font-size:12px;color:#666;">Mesas</div>
      </div>
      <div class="stat-card" style="padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center;background:#f8f9fa;">
        <div style="font-size:28px;font-weight:bold;color:#dc3545;">${transmisiones.count || 0}</div>
        <div style="font-size:12px;color:#666;">Transmisiones</div>
      </div>
    `
  }

  // Cargar gráfico de votos
  const chartContainer = container.querySelector('#admin-pie-chart')
  if (chartContainer) {
    const { data: monitorData } = await supabase
      .from('vista_monitoreo')
      .select('partido_id, partido, sigla, color_hex, total_votos')
      .order('total_votos', { ascending: false })

    if (monitorData && monitorData.length > 0) {
      const total = monitorData.reduce((acc: number, row: any) => acc + (row.total_votos || 0), 0)
      let angle = 0
      let svgPaths = ''

      monitorData.forEach((row: any) => {
        const votos = row.total_votos || 0
        const pct = (votos / total) * 100
        const sliceAngle = (pct / 100) * 360

        const startRad = (angle * Math.PI) / 180
        const endRad = ((angle + sliceAngle) * Math.PI) / 180
        const x1 = 140 + 120 * Math.cos(startRad - Math.PI / 2)
        const y1 = 140 + 120 * Math.sin(startRad - Math.PI / 2)
        const x2 = 140 + 120 * Math.cos(endRad - Math.PI / 2)
        const y2 = 140 + 120 * Math.sin(endRad - Math.PI / 2)
        const largeArc = sliceAngle > 180 ? 1 : 0

        svgPaths += `<path d="M 140 140 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 120 120 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z"
          fill="${row.color_hex || '#999'}" stroke="white" stroke-width="2"/>`

        angle += sliceAngle
      })

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', '280')
      svg.setAttribute('height', '280')
      svg.setAttribute('viewBox', '0 0 280 280')
      svg.innerHTML = svgPaths

      chartContainer.innerHTML = ''
      chartContainer.appendChild(svg)
    } else {
      chartContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Sin datos de votos</div>'
    }
  }

  // Cargar incidencias pendientes
  const incidenciasList = container.querySelector<HTMLElement>('#admin-incidencias-list')
  if (incidenciasList) {
    const { data: incidencias } = await supabase
      .from('incidencias')
      .select('id, descripcion, estado, created_at, mesas(numero_mesa), usuarios(nombre)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    if (incidencias && incidencias.length > 0) {
      incidenciasList.innerHTML = incidencias
        .map(
          (inc: any) => `<div class="mesa-item">
          <div class="mesa-info">
            <strong>Mesa ${(inc.mesas as any)?.numero_mesa ?? '?'}</strong>
            <span>${inc.descripcion || 'Sin descripción'}</span>
            <small style="color:#999">${new Date(inc.created_at).toLocaleString()}</small>
          </div>
        </div>`
        )
        .join('')
    } else {
      incidenciasList.innerHTML = '<p class="empty" style="color:#28a745;font-weight:bold;">✓ No hay incidencias pendientes</p>'
    }
  }
}

export default createAdminDashboard
