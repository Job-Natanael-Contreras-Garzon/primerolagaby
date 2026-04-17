/**
 * ImageGallery: Galería de imágenes de actas transmitidas
 * - Muestra grid de imágenes
 * - Filtrar por mesa, colegio, estado
 * - Preview y descarga
 *
 * Máx 180 líneas
 */

import { supabase } from '../../../utils/supabase'

interface ImageGalleryProps {
  catalogos?: any
}

export async function createImageGallery(_props?: ImageGalleryProps): Promise<HTMLElement> {
  const container = document.createElement('div')

  container.innerHTML = `
    <article class="card">
      <h3>🖼️ Galería de Actas</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label for="admin-gallery-colegio">Filtrar por Colegio</label>
          <select id="admin-gallery-colegio">
            <option value="">Todos</option>
          </select>
        </div>
        <div>
          <label for="admin-gallery-estado">Estado</label>
          <select id="admin-gallery-estado">
            <option value="">Todos</option>
            <option value="completada">Completada</option>
            <option value="revisada">Revisada</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
      </div>
    </article>

    <article class="card">
      <h3>📸 Imágenes</h3>
      <div id="admin-gallery-grid" class="gallery-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px;"></div>
    </article>
  `

  await bindImageGallery(container)

  return container
}

async function bindImageGallery(container: HTMLElement) {
  const galleryGrid = container.querySelector<HTMLElement>('#admin-gallery-grid')
  const filterColegio = container.querySelector<HTMLSelectElement>('#admin-gallery-colegio')
  const filterEstado = container.querySelector<HTMLSelectElement>('#admin-gallery-estado')

  // Cargar colegios
  if (filterColegio) {
    const { data: colegios } = await supabase.from('recintos').select('id, nombre').eq('activo', true).order('nombre')
    if (colegios) {
      colegios.forEach((c: any) => {
        const opt = document.createElement('option')
        opt.value = c.id
        opt.textContent = c.nombre
        filterColegio.appendChild(opt)
      })
    }
  }

  const loadImages = async () => {
    if (!galleryGrid) return
    galleryGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;">Cargando...</p>'

    let query = supabase.from('transmisiones').select(`
      id, imagen_acta_url, estado, votos, mesas(numero, colegio_id),
      recintos:mesas(recintos(nombre))
    `)

    if (filterColegio?.value) {
      // This would need proper join in real implementation
      // For now, load all and filter client-side
    }

    const { data, error } = await query.eq('activo', true).limit(50)

    if (error) {
      galleryGrid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:#c00;">Error cargando imágenes</p>'
      return
    }

    let images = data || []

    if (filterColegio?.value) {
      // Filter client-side
      images = images.filter((img: any) => {
        return (img.mesas as any)?.colegio_id === parseInt(filterColegio.value)
      })
    }

    if (filterEstado?.value) {
      images = images.filter((img: any) => img.estado === filterEstado.value)
    }

    if (images.length === 0) {
      galleryGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;" class="empty">No hay imágenes</p>'
      return
    }

    galleryGrid.innerHTML = images
      .map((img: any) => {
        const mesa = (img.mesas as any) || {}
        const estado = img.estado || 'sin-estado'
        const estatusBg =
          estado === 'completada'
            ? '#28a745'
            : estado === 'revisada'
              ? '#007bff'
              : '#ffc107'

        return `
        <div class="gallery-card" style="cursor:pointer;border:1px solid #ddd;border-radius:6px;overflow:hidden;transition:transform 0.2s;">
          <div style="position:relative;width:100%;height:150px;background:#f0f0f0;overflow:hidden;">
            ${img.imagen_acta_url ? `<img src="${img.imagen_acta_url}" alt="Mesa ${mesa.numero}" style="width:100%;height:100%;object-fit:cover;">` : '<p style="text-align:center;margin-top:50px;color:#999;">Sin imagen</p>'}
            <span style="position:absolute;top:8px;right:8px;background:${estatusBg};color:white;padding:4px 8px;border-radius:3px;font-size:12px;">${estado}</span>
          </div>
          <div style="padding:8px;background:#f9f9f9;">
            <div style="font-weight:bold;font-size:14px;">Mesa ${mesa.numero || '?'}</div>
            <div style="font-size:12px;color:#666;">${img.votos || 0} votos</div>
            ${img.imagen_acta_url ? `<a href="${img.imagen_acta_url}" target="_blank" style="color:#007bff;font-size:11px;">Descargar</a>` : ''}
          </div>
        </div>
        `
      })
      .join('')
  }

  if (filterColegio) {
    filterColegio.addEventListener('change', loadImages)
  }
  if (filterEstado) {
    filterEstado.addEventListener('change', loadImages)
  }

  loadImages()
}

export default createImageGallery
