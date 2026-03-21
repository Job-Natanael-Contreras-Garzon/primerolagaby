// ─── GESTOR DE PAGINACIÓN ──────────────────────────────────────────────────

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  startIndex: number
  endIndex: number
}

export const pagination = {
  // Calcular estado de paginación
  calculate(totalItems: number, currentPage: number = 1, pageSize: number = 100): PaginationState {
    const totalPages = Math.ceil(totalItems / pageSize)
    const validPage = Math.max(1, Math.min(currentPage, totalPages || 1))
    const startIndex = (validPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)

    return {
      currentPage: validPage,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
    }
  },

  // Obtener items de una página
  getPageItems<T>(items: T[], currentPage: number = 1, pageSize: number = 100): T[] {
    const state = this.calculate(items.length, currentPage, pageSize)
    return items.slice(state.startIndex, state.endIndex)
  },

  // Generar HTML de controles de paginación
  generatePaginationHTML(state: PaginationState): string {
    if (state.totalPages <= 1) return ''

    const prevDisabled = state.currentPage === 1
    const nextDisabled = state.currentPage === state.totalPages

    let html = `<div class="pagination" style="display:flex;justify-content:center;gap:8px;align-items:center;margin-top:16px;flex-wrap:wrap;">`

    // Botón anterior
    html += `<button 
      class="pagination-btn" 
      data-page="${state.currentPage - 1}"
      ${prevDisabled ? 'disabled' : ''}
      style="padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:${prevDisabled ? 'not-allowed' : 'pointer'};opacity:${prevDisabled ? '0.5' : '1'};"
    >← Anterior</button>`

    // Números de página
    const startPage = Math.max(1, state.currentPage - 2)
    const endPage = Math.min(state.totalPages, state.currentPage + 2)

    if (startPage > 1) {
      html += `<button class="pagination-btn" data-page="1" style="padding:8px 10px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;">1</button>`
      if (startPage > 2) html += `<span style="padding:0 4px;">...</span>`
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === state.currentPage
      html += `<button 
        class="pagination-btn" 
        data-page="${i}"
        style="padding:8px 10px;border:1px solid ${isActive ? '#007bff' : '#ddd'};border-radius:4px;background:${isActive ? '#007bff' : '#f8f9fa'};color:${isActive ? 'white' : 'black'};cursor:pointer;font-weight:${isActive ? 'bold' : 'normal'};"
      >${i}</button>`
    }

    if (endPage < state.totalPages) {
      if (endPage < state.totalPages - 1) html += `<span style="padding:0 4px;">...</span>`
      html += `<button class="pagination-btn" data-page="${state.totalPages}" style="padding:8px 10px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;">${state.totalPages}</button>`
    }

    // Botón siguiente
    html += `<button 
      class="pagination-btn" 
      data-page="${state.currentPage + 1}"
      ${nextDisabled ? 'disabled' : ''}
      style="padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:${nextDisabled ? 'not-allowed' : 'pointer'};opacity:${nextDisabled ? '0.5' : '1'};"
    >Siguiente →</button>`

    // Información
    html += `<span style="font-size:12px;color:#666;margin-left:12px;">Página ${state.currentPage} de ${state.totalPages}</span>`

    html += `</div>`

    return html
  },

  // Vincular eventos de paginación
  attachPaginationEvents(containerId: string, callback: (page: number) => void) {
    const container = document.querySelector(`#${containerId}`)
    if (!container) return

    container.querySelectorAll<HTMLButtonElement>('.pagination-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page || '1')
        callback(page)
      })
    })
  },
}
