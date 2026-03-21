// ─── MANEJO DE IMPORTACIÓN/EXPORTACIÓN EXCEL ────────────────────────────
import * as XLSX from 'xlsx'

export const excelHandler = {
  // Exportar usuarios a Excel
  exportUsuarios(usuarios: any[]) {
    const ws = XLSX.utils.json_to_sheet(
      usuarios.map((u) => ({
        ID: u.id,
        Nombre: u.nombre,
        Apellido: u.apellido,
        Email: u.email,
        Rol: u.rol,
        Distrito: u.distritos?.nombre || '',
        Activo: u.activo ? 'Sí' : 'No',
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
    XLSX.writeFile(wb, 'usuarios.xlsx')
  },

  // Exportar distritos a Excel
  exportDistritos(distritos: any[]) {
    const ws = XLSX.utils.json_to_sheet(
      distritos.map((d) => ({
        ID: d.id,
        Nombre: d.nombre,
        Número: d.numero_distrito,
        Activo: d.activo ? 'Sí' : 'No',
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Distritos')
    XLSX.writeFile(wb, 'distritos.xlsx')
  },

  // Exportar recintos a Excel
  exportRecintos(recintos: any[]) {
    const ws = XLSX.utils.json_to_sheet(
      recintos.map((r) => ({
        ID: r.id,
        Nombre: r.nombre,
        Dirección: r.direccion || '',
        Distrito: r.distritos?.nombre || '',
        Latitud: r.lat || '',
        Longitud: r.lng || '',
        Activo: r.activo ? 'Sí' : 'No',
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recintos')
    XLSX.writeFile(wb, 'recintos.xlsx')
  },

  // Exportar mesas a Excel
  exportMesas(mesas: any[]) {
    const ws = XLSX.utils.json_to_sheet(
      mesas.map((m) => ({
        ID: m.id,
        NúmeroMesa: m.numero_mesa,
        Recinto: m.recintos?.nombre || '',
        Estado: m.estado,
        Habilitados: m.total_habilitados,
        Fecha: m.created_at ? new Date(m.created_at).toLocaleString() : '',
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mesas')
    XLSX.writeFile(wb, 'mesas.xlsx')
  },

  // Descargar plantilla de importación de usuarios
  descargarPlantillaUsuarios() {
    const plantilla = [
      {
        Nombre: 'Juan',
        Apellido: 'Pérez',
        Email: 'juan.perez@example.com',
        Rol: 'veedor',
        Distrito: 'Distrito 01',
        Recinto: 'Colegio Central',
      },
      {
        Nombre: 'María',
        Apellido: 'García',
        Email: 'maria.garcia@example.com',
        Rol: 'supervisor1',
        Distrito: 'Distrito 01',
        Recinto: 'Colegio Central',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(plantilla)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
    XLSX.writeFile(wb, 'plantilla_usuarios.xlsx')
  },

  // Descargar plantilla de recintos
  descargarPlantillaRecintos() {
    const plantilla = [
      {
        Nombre: 'Colegio Central',
        Dirección: 'Calle Principal 123',
        Distrito: 'Distrito 01',
        Latitud: '-17.783889',
        Longitud: '-63.182222',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(plantilla)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recintos')
    XLSX.writeFile(wb, 'plantilla_recintos.xlsx')
  },

  // Leer archivo Excel cargado
  async leerArchivo(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws)
          resolve(json)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  },
}
