/**
 * Binding de Veedor - Manejo de formulario, cámara y validaciones
 * Los botones están DESHABILITADOS hasta que todo esté cargado
 */

import { startCamera, stopCamera, capturePhoto, isMediaSupported } from '../../utils/camera'
import { supabase } from '../../utils/supabase'

const cargos = [
  { id: 1, nombre: 'Alcalde' },
  { id: 2, nombre: 'Concejal' },
]

const partidos = [
  { id: 1, nombre: 'Frente Progresista', sigla: 'FP', color: '#e6008e' },
  { id: 2, nombre: 'Alianza Democrática', sigla: 'AD', color: '#00b4d8' },
  { id: 3, nombre: 'Movimiento Ciudadano', sigla: 'MC', color: '#ffc300' },
]

const candidatos = [
  { id: 1, nombre: 'Juan Pérez', partido_id: 1, cargo_id: 1 },
  { id: 2, nombre: 'María López', partido_id: 2, cargo_id: 1 },
  { id: 3, nombre: 'Carlos García', partido_id: 3, cargo_id: 1 },
  { id: 4, nombre: 'Ana Ruiz', partido_id: 1, cargo_id: 2 },
  { id: 5, nombre: 'Roberto Silva', partido_id: 2, cargo_id: 2 },
  { id: 6, nombre: 'Isabel Martín', partido_id: 3, cargo_id: 2 },
]

export async function bindVeedor(): Promise<void> {
  const selectionFieldset = document.querySelector<HTMLElement>('#selection-fieldset')
  const dataFieldset = document.querySelector<HTMLElement>('#data-fieldset')
  const selectedLocationSpan = document.querySelector<HTMLElement>('#selected-location strong')
  const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')
  const btnCamera = document.querySelector<HTMLButtonElement>('#btn-camera')
  const btnGallery = document.querySelector<HTMLButtonElement>('#btn-gallery')
  const cameraStatus = document.querySelector<HTMLElement>('#camera-status')
  
  // Variables de estado
  let fotoCapturada = false
  let formularioListo = false
  const cargoVotes: Record<number, number> = {}

  // ============================================
  // 1. HELPER: Mostrar sección de datos
  // ============================================
  const showDataSection = (locationText: string) => {
    if (selectionFieldset) selectionFieldset.style.display = 'none'
    if (dataFieldset) dataFieldset.style.display = 'block'
    if (selectedLocationSpan) selectedLocationSpan.textContent = locationText
    
    console.log('📋 Cargando formulario de datos...')
    
    // Los botones de foto se habilitarán cuando la cámara esté lista
    checkAllReady()
    
    dataFieldset?.scrollIntoView({ behavior: 'smooth' })
  }

  const showSelectionSection = () => {
    if (selectionFieldset) selectionFieldset.style.display = 'block'
    if (dataFieldset) dataFieldset.style.display = 'none'
    selectionFieldset?.scrollIntoView({ behavior: 'smooth' })
  }

  // ============================================
  // 2. CÁMARA - Inicializar cuando se carga
  // ============================================
  const initCamera = async () => {
    if (!isMediaSupported()) {
      console.warn('⚠️  Cámara no soportada')
      if (cameraStatus) cameraStatus.textContent = '⚠️ Cámara no disponible en este dispositivo'
      return
    }

    try {
      // Intentar obtener acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      
      // Si funciona, detener inmediatamente y esperar a que el usuario abra el modal
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        
        if (cameraStatus) cameraStatus.textContent = '✓ Cámara lista'
        if (btnCamera) btnCamera.disabled = false
        if (btnCamera) btnCamera.style.opacity = '1'
        if (btnGallery) btnGallery.disabled = false
        if (btnGallery) btnGallery.style.opacity = '1'
        
        console.log('✓ Cámara verificada')
      }
    } catch (error) {
      console.warn('⚠️  Permiso de cámara denegado:', error)
      if (cameraStatus) cameraStatus.textContent = '⚠️ Permiso de cámara denegado'
      // La galería sigue funcionando
      if (btnGallery) btnGallery.disabled = false
      if (btnGallery) btnGallery.style.opacity = '1'
    }
  }

  // ============================================
  // 3. VALIDACIÓN - Verificar si todo está listo
  // ============================================
  const checkAllReady = () => {
    if (!submitBtn) return

    const mesaInput = document.querySelector<HTMLInputElement>('#veedor-mesa')
    const fotoInput = document.querySelector<HTMLInputElement>('#veedor-foto')
    const mesa = mesaInput?.value?.trim() || ''
    const foto = fotoInput?.value || ''
    
    // Verificar candidatos
    let todosCargosCompletos = true
    const allInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
    
    for (const cargo of cargos) {
      if ((cargoVotes[cargo.id] || 0) === 0) {
        todosCargosCompletos = false
        break
      }
    }

    // Habilitar si: mesa + foto + todos cargos completos
    const todoBien = mesa.length >= 3 && foto && todosCargosCompletos
    
    if (todoBien !== formularioListo) {
      formularioListo = todoBien
      submitBtn.disabled = !formularioListo
      
      if (formularioListo) {
        submitBtn.style.opacity = '1'
        submitBtn.innerHTML = '✓ Guardar mesa'
      } else {
        submitBtn.style.opacity = '0.5'
        submitBtn.innerHTML = '⏳ Completa todo antes de guardar'
      }
    }
  }

  // ============================================
  // 4. CARGAR COLEGIOS Y DISTRITOS
  // ============================================
  const loadColegios = async () => {
    try {
      const { data: distritos } = await supabase
        .from('distritos')
        .select('id, nombre')
        .order('nombre')

      const { data: colegios } = await supabase
        .from('recintos')
        .select('id, nombre, distrito_id')
        .order('nombre')

      return { distritos: distritos || [], colegios: colegios || [] }
    } catch (error) {
      console.error('❌ Error cargando colegios:', error)
      return { distritos: [], colegios: [] }
    }
  }

  // ============================================
  // 5. CONFIGURAR SELECTORES DE COLEGIO
  // ============================================
  const configureSelection = async () => {
    const { distritos, colegios } = await loadColegios()
    
    // Selector de distrito
    const distritoSelect = document.querySelector<HTMLSelectElement>('#veedor-distrito')
    const colegioSelect = document.querySelector<HTMLSelectElement>('#veedor-colegio')

    if (distritoSelect && distritos.length > 0) {
      distritos.forEach(d => {
        const option = document.createElement('option')
        option.value = d.id
        option.textContent = d.nombre
        distritoSelect.appendChild(option)
      })

      distritoSelect.addEventListener('change', () => {
        if (colegioSelect) {
          colegioSelect.innerHTML = '<option value="">Selecciona colegio</option>'
          
          const selectedDistritoId = distritoSelect.value
          const colegiosDelDistrito = colegios.filter(c => c.distrito_id === selectedDistritoId)
          
          colegiosDelDistrito.forEach(c => {
            const option = document.createElement('option')
            option.value = c.id
            option.textContent = c.nombre
            colegioSelect.appendChild(option)
          })
        }
      })
    }
  }

  // ============================================
  // 6. CARGOS Y CANDIDATOS
  // ============================================
  const renderCargos = () => {
    const cargoTabs = document.querySelector<HTMLElement>('#cargo-tabs')
    if (!cargoTabs) return

    const html = cargos
      .map((cargo, idx) => 
        `<button class="cargo-tab ${idx === 0 ? 'is-active' : ''}" type="button" data-cargo="${cargo.id}">${cargo.nombre}</button>`
      )
      .join('')
    
    cargoTabs.innerHTML = html

    // Evento para cambiar cargos
    const tabs = document.querySelectorAll<HTMLButtonElement>('.cargo-tab')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'))
        tab.classList.add('is-active')
        const cargoId = parseInt(tab.dataset.cargo as string)
        renderCandidatos(cargoId)
        checkAllReady()
      })
    })

    // Renderizar primer cargo
    if (tabs.length > 0) {
      const firstCargoId = parseInt(tabs[0].dataset.cargo as string)
      renderCandidatos(firstCargoId)
    }
  }

  const renderCandidatos = (cargoId: number) => {
    const candidatosGrid = document.querySelector<HTMLElement>('#candidatos-grid')
    if (!candidatosGrid) return

    const filtered = candidatos.filter(c => c.cargo_id === cargoId)

    const candidatosHtml = filtered
      .map(c => {
        const partido = partidos.find(p => p.id === c.partido_id)
        return `<label class="candidato-item">
          <input type="number" min="0" value="0" data-candidato="${c.id}" />
          <span>${c.nombre}</span>
          <span class="partido-badge" style="background-color: ${partido?.color || '#ccc'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">${partido?.sigla}</span>
        </label>`
      })
      .join('')

    const blankHtml = `
      <div style="border-top: 2px solid #f0cce6; padding-top: 16px; margin-top: 16px;">
        <label class="candidato-item">
          <input type="number" min="0" value="0" data-tipo="nulos" />
          <span>Votos Nulos</span>
          <span class="partido-badge" style="background-color: #999999; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">NULOS</span>
        </label>
        <label class="candidato-item">
          <input type="number" min="0" value="0" data-tipo="blancos" />
          <span>Votos en Blanco</span>
          <span class="partido-badge" style="background-color: #cccccc; color: #333; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">BLANCOS</span>
        </label>
      </div>
    `

    candidatosGrid.innerHTML = `<div class="candidatos-list">${candidatosHtml}${blankHtml}</div>`

    // Event listeners en inputs
    const allInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
    allInputs.forEach(input => {
      input.addEventListener('input', () => {
        const activeTab = document.querySelector<HTMLElement>('.cargo-tab.is-active')
        if (activeTab) {
          const currentCargoId = parseInt(activeTab.dataset.cargo as string)
          const currentInputs = document.querySelectorAll<HTMLInputElement>('.candidatos-grid input[type="number"]')
          const total = Array.from(currentInputs).reduce((sum, inp) => sum + (parseInt(inp.value) || 0), 0)
          cargoVotes[currentCargoId] = total
        }
        checkAllReady()
      })
    })
  }

  // ============================================
  // 7. FOTO Y CÁMARA
  // ============================================
  const setupPhoto = () => {
    const btnCamera = document.querySelector<HTMLButtonElement>('#btn-camera')
    const btnGallery = document.querySelector<HTMLButtonElement>('#btn-gallery')
    const btnCapturePhoto = document.querySelector<HTMLButtonElement>('#btn-capture-photo')
    const btnCloseCamera = document.querySelector<HTMLButtonElement>('#btn-close-camera')
    const btnCancelCamera = document.querySelector<HTMLButtonElement>('#btn-cancel-camera')
    const cameraModal = document.querySelector<HTMLElement>('#camera-modal')
    const cameraVideo = document.querySelector<HTMLVideoElement>('#camera-video')
    const cameraCanvas = document.querySelector<HTMLCanvasElement>('#camera-canvas')
    const fotoGalleryInput = document.querySelector<HTMLInputElement>('#veedor-foto-gallery')
    const fotoHiddenInput = document.querySelector<HTMLInputElement>('#veedor-foto')
    const fotoPreview = document.querySelector<HTMLElement>('#foto-preview')
    const previewImg = document.querySelector<HTMLImageElement>('#preview-img')

    // Abrir cámara
    if (btnCamera) {
      btnCamera.addEventListener('click', async (e) => {
        e.preventDefault()
        if (cameraModal) cameraModal.style.display = 'flex'
        if (cameraVideo) {
          const success = await startCamera(cameraVideo)
          if (!success && cameraStatus) {
            cameraStatus.textContent = '❌ No se pudo acceder a la cámara'
          }
        }
      })
    }

    // Capturar foto
    if (btnCapturePhoto && cameraCanvas && cameraVideo) {
      btnCapturePhoto.addEventListener('click', (e) => {
        e.preventDefault()
        const photoData = capturePhoto(cameraVideo, cameraCanvas)
        
        if (photoData) {
          if (previewImg) previewImg.src = photoData
          if (fotoHiddenInput) fotoHiddenInput.value = photoData
          if (fotoPreview) fotoPreview.style.display = 'block'
          
          fotoCapturada = true
          stopCamera()
          if (cameraModal) cameraModal.style.display = 'none'
          
          console.log('✓ Foto capturada')
          checkAllReady()
        }
      })
    }

    // Cerrar cámara
    const closeCamera = () => {
      stopCamera()
      if (cameraModal) cameraModal.style.display = 'none'
    }

    if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeCamera)
    if (btnCancelCamera) btnCancelCamera.addEventListener('click', closeCamera)

    // Galería
    if (btnGallery && fotoGalleryInput) {
      btnGallery.addEventListener('click', (e) => {
        e.preventDefault()
        fotoGalleryInput.click()
      })
    }

    if (fotoGalleryInput) {
      fotoGalleryInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const photoData = event.target?.result as string
            if (previewImg) previewImg.src = photoData
            if (fotoHiddenInput) fotoHiddenInput.value = photoData
            if (fotoPreview) fotoPreview.style.display = 'block'
            
            fotoCapturada = true
            console.log('✓ Foto seleccionada')
            checkAllReady()
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }

  // ============================================
  // 8. CAMBIAR UBICACIÓN
  // ============================================
  const btnChangeLocation = document.querySelector<HTMLButtonElement>('#btn-change-location')
  if (btnChangeLocation) {
    btnChangeLocation.addEventListener('click', (e) => {
      e.preventDefault()
      showSelectionSection()
    })
  }

  // ============================================
  // 9. CONFIRMAR SELECCIÓN MANUAL
  // ============================================
  const btnManualConfirm = document.querySelector<HTMLButtonElement>('#btn-manual-confirm')
  const colegioSelect = document.querySelector<HTMLSelectElement>('#veedor-colegio')
  
  if (btnManualConfirm) {
    btnManualConfirm.addEventListener('click', (e) => {
      e.preventDefault()
      const colegio = colegioSelect?.value || ''
      
      if (colegio) {
        const colegioName = colegioSelect?.options[colegioSelect.selectedIndex]?.text || 'Colegio'
        showDataSection(colegioName)
      } else {
        alert('Por favor selecciona un colegio')
      }
    })
  }

  // ============================================
  // 10. ENVÍO DE FORMULARIO
  // ============================================
  const form = document.querySelector<HTMLFormElement>('#veedor-form')
  const successFieldset = document.querySelector<HTMLElement>('#success-fieldset')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const mesaInput = document.querySelector<HTMLInputElement>('#veedor-mesa')
      const mesa = mesaInput?.value?.trim() || 'Sin número'
      const ubicacion = selectedLocationSpan?.textContent || 'Desconocida'

      console.log(`✓ Mesa enviada: ${mesa} - ${ubicacion}`)

      if (dataFieldset) dataFieldset.style.display = 'none'
      if (successFieldset) successFieldset.style.display = 'block'
      successFieldset?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  // ============================================
  // 11. LOGOUT
  // ============================================
  const btnLogout = document.querySelector<HTMLButtonElement>('#btn-logout-veedor')
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut()
      window.localStorage.removeItem('authUser')
      window.localStorage.removeItem('authRole')
      window.history.pushState({}, '', '/login')
      // Llamar a renderRoute que debe estar disponible en window
      const renderRoute = (window as any).renderRoute
      if (renderRoute) renderRoute()
    })
  }

  // ============================================
  // 12. TOGGLE DE BÚSQUEDA (Search vs Manual)
  // ============================================
  const selectionBtns = document.querySelectorAll<HTMLButtonElement>('.selection-btn')
  const selectionSearch = document.querySelector<HTMLElement>('#selection-search')
  const selectionManual = document.querySelector<HTMLElement>('#selection-manual')

  selectionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const selection = btn.dataset.selection
      selectionBtns.forEach(b => b.classList.remove('is-active'))
      btn.classList.add('is-active')

      if (selection === 'search') {
        selectionSearch?.classList.add('is-active')
        selectionManual?.classList.remove('is-active')
      } else {
        selectionManual?.classList.add('is-active')
        selectionSearch?.classList.remove('is-active')
      }
    })
  })

  // ============================================
  // 13. CONFIRMAR SELECCIÓN MANUAL DE COLEGIO
  // ============================================
  const btnManualConfirm = document.querySelector<HTMLButtonElement>('#btn-manual-confirm')
  const colegioSelect = document.querySelector<HTMLSelectElement>('#veedor-colegio')
  const distritoSelect = document.querySelector<HTMLSelectElement>('#veedor-distrito')

  if (btnManualConfirm) {
    btnManualConfirm.addEventListener('click', (e) => {
      e.preventDefault()
      const colegio = colegioSelect?.value || ''
      const distrito = distritoSelect?.value || ''

      if (colegio && distrito) {
        // Obtener nombres de los datos cargados
        const colegioName = colegioSelect?.options[colegioSelect.selectedIndex]?.text || colegio
        const distritoName = distritoSelect?.options[distritoSelect.selectedIndex]?.text || distrito
        showDataSection(`${distritoName} - ${colegioName}`)
      } else {
        alert('Por favor, selecciona un distrito y un colegio')
      }
    })
  }

  // ============================================
  // 14. BOTÓN CAMBIAR UBICACIÓN
  // ============================================
  const btnChangeLocation = document.querySelector<HTMLButtonElement>('#btn-change-location')
  if (btnChangeLocation) {
    btnChangeLocation.addEventListener('click', (e) => {
      e.preventDefault()
      showSelectionSection()
    })
  }

  // ============================================
  // 15. BÚSQUEDA POR NOMBRE DE COLEGIO
  // ============================================
  const colegioSearchInput = document.querySelector<HTMLInputElement>('#colegio-search')
  const colegioResults = document.querySelector<HTMLUListElement>('#colegio-results')
  const btnColegioDropdown = document.querySelector<HTMLButtonElement>('#colegio-search-dropdown')

  if (colegioSearchInput && colegioResults) {
    // Función para filtrar y mostrar colegios
    const renderColegios = (filterTerm: string = '') => {
      const colegios = filterTerm.trim() === ''
        ? []
        : (window as any).colegiosMock?.filter((c: any) =>
            c.nombre.toLowerCase().includes(filterTerm.toLowerCase())
          ) || []

      colegioResults.innerHTML = colegios.length > 0
        ? colegios.map((c: any) =>
            `<li data-colegio="${c.nombre}" data-distrito="${c.distrito}">
              <strong>${c.nombre}</strong>
              <span>${c.distrito}</span>
            </li>`
          ).join('')
        : filterTerm.trim() !== '' ? '<li class="empty">Sin coincidencias</li>' : ''
    }

    // Evento de búsqueda
    colegioSearchInput.addEventListener('input', (e) => {
      const searchTerm = (e.target as HTMLInputElement).value
      renderColegios(searchTerm)
    })

    // Click en resultado
    colegioResults.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (li && !li.classList.contains('empty')) {
        const colegio = li.dataset.colegio as string
        const distrito = li.dataset.distrito as string
        
        // Limpiar búsqueda
        colegioSearchInput.value = ''
        colegioResults.innerHTML = ''
        
        // Mostrardatos
        showDataSection(`${distrito} - ${colegio}`)
      }
    })

    // Dropdown para mostrar todos
    if (btnColegioDropdown) {
      btnColegioDropdown.addEventListener('click', () => {
        if (colegioResults.innerHTML !== '') {
          colegioResults.innerHTML = ''
        } else {
          const allColegios = (window as any).colegiosMock || []
          colegioResults.innerHTML = allColegios
            .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
            .map((c: any) =>
              `<li data-colegio="${c.nombre}" data-distrito="${c.distrito}">
                <strong>${c.nombre}</strong>
                <span>${c.distrito}</span>
              </li>`
            ).join('')
        }
      })
    }

    // Cerrar dropdown cuando haces click fuera
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!colegioSearchInput.contains(target) && !btnColegioDropdown?.contains(target)) {
        colegioResults.innerHTML = ''
      }
    })
  }

  // ============================================
  // INICIALIZAR TODO
  // ============================================
  console.log('🚀 Inicializando Veedor...')
  
  // Los botones comienzan DESHABILITADOS
  if (btnCamera) btnCamera.disabled = true
  if (btnGallery) btnGallery.disabled = true
  if (submitBtn) submitBtn.disabled = true

  // Cargar datos en paralelo
  await Promise.all([
    initCamera(),
    configureSelection()
  ])

  // Renderizar cargos y candidatos
  renderCargos()
  setupPhoto()

  console.log('✓ Veedor inicializado')
}
