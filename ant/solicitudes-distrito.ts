// Temporal function - to be integrated
export const renderSolicitudesDistrito = () => {
  const list = document.querySelector<HTMLElement>('#solicitudes-list-distrito')
  if (!list) return
  const solicitudes = JSON.parse(localStorage.getItem('solicitudesAnulacion') || '[]')
  const mesas = JSON.parse(localStorage.getItem('mesasSubidas') || '[]')
  if (solicitudes.length === 0) {
    list.innerHTML = '<p class="empty">No hay solicitudes pendientes</p>'
    return
  }
  const html = solicitudes.map((s: any, i: number) => {
    const mesa = mesas.find((m: any) => m.id === s.mesaId)
    const colegio = mesa?.colegio || 'Desconocido'
    return `<div class="mesa-item"><div class="mesa-info"><strong>Mesa ${mesa?.mesaNumero}</strong><span>${colegio}</span><small style="color: #999; display: block; margin-top: 4px;">${s.fecha}</small></div><button class="btn-aceptar-solicitud" data-idx="${i}" style="background: #28a745; color: white;">Aceptar</button></div>`
  }).join('')
  list.innerHTML = html
  document.querySelectorAll<HTMLButtonElement>('.btn-aceptar-solicitud').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx as string)
      solicitudes.splice(idx, 1)
      localStorage.setItem('solicitudesAnulacion', JSON.stringify(solicitudes))
      alert('Solicitud aceptada')
      renderSolicitudesDistrito()
    })
  })
}
