import { supabase } from '../../../utils/supabase'
import { type RouteId } from '../shared/types'

interface VeedorViewProps {
  onNavigate: (route: RouteId) => void
  onLogout: () => void
}

export async function createVeedorView({ onNavigate, onLogout }: VeedorViewProps): Promise<HTMLElement> {
  const container = document.createElement('div')
  container.innerHTML = getVeedorTemplate()
  await bindVeedorForm(container, onNavigate, onLogout)
  return container
}

function getVeedorTemplate(): string {
  return `
    <section class="public-shell" style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <header class="public-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">
        <div>
          <p class="badge" style="background:#007bff; color:white; padding:2px 8px; border-radius:12px; font-size:12px; display:inline-block; margin:0 0 5px 0;">Delegado Veedor</p>
          <h1 style="margin: 0; font-size: 1.5rem;">Transmisión de Resultados</h1>
        </div>
        <button type="button" class="btn-link-header" id="btn-logout-veedor" style="color: #d90000; background:none; border:none; cursor:pointer; font-weight:bold;">Salir</button>
      </header>

      <div id="loading-overlay" style="display:none; text-align:center; padding: 20px; color:#666;">
        Procesando...
      </div>

      <!-- PASO 1: BÚSQUEDA DE MESA -->
      <article class="card large-form" id="step-1-mesa">
        <h3 style="margin-top:0;">Paso 1: Identificar Mesa</h3>
        <p style="color:#666; font-size:14px;">Seleccione su recinto y digite el número de mesa asignada.</p>
        
        <form id="form-search-mesa" style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
          <div>
            <label for="veedor-recinto" style="font-weight:bold; display:block; margin-bottom:5px;">Recinto de Votación</label>
            <select id="veedor-recinto" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
              <option value="">Cargando recintos...</option>
            </select>
          </div>
          <div>
            <label for="veedor-numero-mesa" style="font-weight:bold; display:block; margin-bottom:5px;">Número de Mesa</label>
            <input id="veedor-numero-mesa" type="text" placeholder="Ej: 001" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;" />
          </div>
          <button type="submit" class="cta-large" style="background:#007bff; color:white; border:none; padding:12px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">
            Validar Mesa
          </button>
        </form>
        <div id="mesa-error" style="color:red; margin-top:10px; font-size:14px; text-align:center;"></div>
      </article>

      <!-- PASO 2: FORMULARIO DE CARGA (Oculto inicialmente) -->
      <article class="card large-form" id="step-2-carga" style="display:none;">
        <h3 style="margin-top:0; color:#28a745;">Mesa Validada <span id="mesa-validada-label"></span></h3>
        <p style="color:#666; font-size:14px;">Ingrese los resultados oficiales del acta.</p>

        <form id="form-transmision" style="display:flex; flex-direction:column; gap:20px; margin-top:15px;">
          
          <!-- Evidencia -->
          <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
            <label for="veedor-foto" style="font-weight:bold; display:block; margin-bottom:5px;">📷 Foto del Acta (Obligatorio)</label>
            <input id="veedor-foto" type="file" accept="image/*" required style="width:100%;"/>
          </div>

          <!-- TABS PARA CARGOS -->
          <div class="veedor-tabs" style="display:flex; gap:10px; border-bottom:2px solid #eee;">
            <button type="button" class="tab-btn is-active" data-cargo="alcalde" style="flex:1; padding:10px; border:none; background:none; border-bottom:3px solid transparent; cursor:pointer; font-weight:bold; font-size:16px;">🏢 Alcalde</button>
            <button type="button" class="tab-btn" data-cargo="concejal" style="flex:1; padding:10px; border:none; background:none; border-bottom:3px solid transparent; cursor:pointer; font-weight:bold; font-size:16px;">👥 Concejales</button>
          </div>

          <!-- CONTENIDO ALCALDE -->
          <div id="cargo-alcalde" class="cargo-content" style="display:block;">
            <div id="partidos-alcalde" style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;"></div>
          </div>

          <!-- CONTENIDO CONCEJAL -->
          <div id="cargo-concejal" class="cargo-content" style="display:none;">
            <div id="partidos-concejal" style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;"></div>
          </div>

          <!-- VOTOS ESPECIALES (TOTALES DEL ACTA) -->
          <div style="background:#fff3cd; padding:15px; border-radius:8px; border:1px solid #ffeeba;">
            <h4 style="margin: 0 0 10px 0; color:#856404;">Votos Especiales (Toda el Acta)</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
               <div>
                  <label style="font-size:14px; font-weight:bold;">Votos Blancos</label>
                  <input id="votos-blancos" type="number" min="0" value="0" required style="width:100%; padding:8px; margin-top:5px; border:1px solid #ccc; border-radius:4px; font-size:16px;" />
               </div>
               <div>
                  <label style="font-size:14px; font-weight:bold;">Votos Nulos</label>
                  <input id="votos-nulos" type="number" min="0" value="0" required style="width:100%; padding:8px; margin-top:5px; border:1px solid #ccc; border-radius:4px; font-size:16px;" />
               </div>
            </div>
          </div>

          <div style="display:flex; gap:10px;">
            <button type="button" id="btn-cancelar" style="flex:1; background:#6c757d; color:white; border:none; padding:12px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">Volver</button>
            <button type="submit" style="flex:2; background:#28a745; color:white; border:none; padding:12px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">Transmitir Resultados</button>
          </div>
        </form>
      </article>

      <!-- PASO 3: ÉXITO -->
      <article class="card large-form" id="step-3-success" style="display:none; text-align:center;">
        <div style="font-size:50px; color:#28a745;">✅</div>
        <h2>¡Transmisión Exitosa!</h2>
        <p style="color:#666;">Los resultados se han guardado correctamente en la base de datos.</p>
        <button type="button" id="btn-nueva-transmision" style="margin-top:20px; background:#007bff; color:white; border:none; padding:12px 24px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">
          Enviar otra acta
        </button>
      </article>

    </section>
  `
}

async function bindVeedorForm(container: HTMLElement, _onNavigate: (route: RouteId) => void, onLogout: () => void) {
  // ELEMENTOS DOM
  const step1 = container.querySelector<HTMLElement>('#step-1-mesa')!
  const step2 = container.querySelector<HTMLElement>('#step-2-carga')!
  const step3 = container.querySelector<HTMLElement>('#step-3-success')!
  const loading = container.querySelector<HTMLElement>('#loading-overlay')!
  
  const formSearch = container.querySelector<HTMLFormElement>('#form-search-mesa')!
  const formTransmision = container.querySelector<HTMLFormElement>('#form-transmision')!
  const selectRecinto = container.querySelector<HTMLSelectElement>('#veedor-recinto')!
  const inputNumeroMesa = container.querySelector<HTMLInputElement>('#veedor-numero-mesa')!
  const errorMesa = container.querySelector<HTMLElement>('#mesa-error')!
  const mesaLabel = container.querySelector<HTMLElement>('#mesa-validada-label')!
  
  const partidosAlcalde = container.querySelector<HTMLElement>('#partidos-alcalde')!
  const partidosConcejal = container.querySelector<HTMLElement>('#partidos-concejal')!
  const inputBlancos = container.querySelector<HTMLInputElement>('#votos-blancos')!
  const inputNulos = container.querySelector<HTMLInputElement>('#votos-nulos')!
  
  const btnLogout = container.querySelector<HTMLButtonElement>('#btn-logout-veedor')!
  const btnCancelar = container.querySelector<HTMLButtonElement>('#btn-cancelar')!
  const btnNueva = container.querySelector<HTMLButtonElement>('#btn-nueva-transmision')!

  // ESTADO GLOBAL
  let currentMesaId: number | null = null
  let currentUser: any = null
  let partidosList: any[] = []

  // TAB LOGIC
  const tabBtns = container.querySelectorAll<HTMLButtonElement>('.tab-btn')
  const cargoContents = container.querySelectorAll<HTMLElement>('.cargo-content')

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('is-active')
        b.style.borderBottomColor = 'transparent'
        b.style.color = '#666'
      })
      cargoContents.forEach(c => c.style.display = 'none')

      btn.classList.add('is-active')
      btn.style.borderBottomColor = '#007bff'
      btn.style.color = '#007bff'
      
      const cargo = btn.dataset.cargo
      const content = container.querySelector<HTMLElement>(`#cargo-${cargo}`)
      if (content) content.style.display = 'block'
    })
  })

  // Activar primera tab por defecto
  const firstTab = tabBtns[0]
  if (firstTab) {
    firstTab.style.borderBottomColor = '#007bff'
    firstTab.style.color = '#007bff'
  }

  // LOGOUT
  if (btnLogout) btnLogout.addEventListener('click', onLogout)

  // OBTENER DATOS INICIALES
  try {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data: usuario } = await supabase.from('usuarios').select('id, nombre').eq('auth_id', session.session.user.id).single()
      currentUser = usuario
    }

    const [{ data: recintosData }, { data: partidosData }] = await Promise.all([
      supabase.from('recintos').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('partidos').select('id, nombre, sigla, color_hex').order('id')
    ])

    if (recintosData) {
      selectRecinto.innerHTML = '<option value="">-- Seleccione Recinto --</option>' + 
        recintosData.map((r:any) => `<option value="${r.id}">${r.nombre}</option>`).join('')
    }
    
    if (partidosData) {
      partidosList = partidosData
      const buildPartidosHTML = (postfix: string) => {
        return partidosList.map((p: any) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f9f9f9; border:1px solid #e0e0e0; border-radius:6px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="display:inline-block; width:15px; height:15px; border-radius:50%; background:${p.color_hex || '#ccc'}"></span>
              <strong>${p.sigla}</strong>
            </div>
            <input type="number" min="0" value="0" required class="voto-input-${postfix}" data-partido="${p.id}" style="width:80px; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:16px; text-align:center;" />
          </div>
        `).join('')
      }
      partidosAlcalde.innerHTML = buildPartidosHTML('alcalde')
      partidosConcejal.innerHTML = buildPartidosHTML('concejal')
    }

  } catch (err) {
    console.error('Error inicializando VeedorView:', err)
  }

  // BUSCAR MESA (Idempotente)
  formSearch.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const submitBtn = formSearch.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitBtn.disabled) return // Evitar doble click
    
    errorMesa.textContent = ''
    const recintoId = selectRecinto.value
    const inputNumero = inputNumeroMesa.value.toString().trim()
    const numPadded = inputNumero.padStart(3, '0') // Soporte para ingreso 1 o 001
    
    submitBtn.disabled = true
    const originalText = submitBtn.textContent || ''
    submitBtn.textContent = 'Validando...'
    step1.style.opacity = '0.5'

    try {
      // Timeout controller para no dejar colgado en caso de mala red
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s límite

      // Check Mesa
      const { data: mesasData, error } = await supabase.from('mesas')
        .select('id, numero_mesa, estado')
        .eq('recinto_id', recintoId)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)
      step1.style.opacity = '1'

      if (error || !mesasData || mesasData.length === 0) {
        errorMesa.textContent = '❌ No se encontró ninguna mesa en este recinto.'
        return
      }

      const mesaEncontrada = mesasData.find((m:any) => 
        m.numero_mesa === inputNumero || 
        m.numero_mesa === numPadded || 
        m.numero_mesa === `Mesa ${numPadded}` || 
        m.numero_mesa === `Mesa ${inputNumero}`
      )

      if (!mesaEncontrada) {
        errorMesa.textContent = '❌ Número de mesa no coincide.'
        return
      }

      if (mesaEncontrada.estado === 'transmitida') {
        errorMesa.textContent = '⚠️ Esta mesa ya ha sido transmitida anteriormente.'
        return
      }

      currentMesaId = mesaEncontrada.id
      mesaLabel.textContent = `(Mesa ${mesaEncontrada.numero_mesa})`
      step1.style.display = 'none'
      step2.style.display = 'block'

    } catch (err: any) {
      step1.style.opacity = '1'
      if (err.name === 'AbortError') {
        errorMesa.textContent = '⏱️ Tiempo de espera agotado. Revise su conexión.'
      } else {
        errorMesa.textContent = '❌ Error de conexión al validar mesa.'
      }
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  })

  // CANCELAR Y VOLVER
  btnCancelar.addEventListener('click', () => {
    formSearch.reset()
    errorMesa.textContent = ''
    step2.style.display = 'none'
    formTransmision.reset()
    step1.style.display = 'block'
    currentMesaId = null
  })

  // NUEVA
  btnNueva.addEventListener('click', () => {
    formSearch.reset()
    formTransmision.reset()
    errorMesa.textContent = ''
    step3.style.display = 'none'
    step1.style.display = 'block'
    currentMesaId = null
  })

  // TRANSMITIR RESULTADOS (Idempotente y Offline-First)
  formTransmision.addEventListener('submit', async (e) => {
    e.preventDefault()

    const submitBtn = formTransmision.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitBtn.disabled) return // Idempotencia: evitar doble submit
    submitBtn.disabled = true

    if (!currentMesaId || !currentUser) {
      alert('Error crítico: Falta información de la mesa o sesión expirada.')
      submitBtn.disabled = false
      return
    }

    const resultadosToInsert: any[] = []
    
    const extractVotos = (selector: string, tipo_cargo: string) => {
      const inputs = container.querySelectorAll<HTMLInputElement>(selector)
      inputs.forEach(input => {
        resultadosToInsert.push({
          partido_id: parseInt(input.dataset.partido as string),
          votos_obtenidos: parseInt(input.value || '0'),
          tipo_cargo: tipo_cargo
        })
      })
    }

    extractVotos('.voto-input-alcalde', 'alcalde')
    extractVotos('.voto-input-concejal', 'concejal')

    const vBlancos = parseInt(inputBlancos.value || '0')
    const vNulos = parseInt(inputNulos.value || '0')
    const vValidos = resultadosToInsert.reduce((sum, r) => sum + r.votos_obtenidos, 0)
    
    // Payload consolidado para guardar offline si falla
    const draftPayload = {
      mesa_id: currentMesaId,
      usuario_id: currentUser.id,
      timestamp: Date.now(),
      vBlancos,
      vNulos,
      vValidos,
      resultados: resultadosToInsert
    }

    step2.style.display = 'none'
    loading.style.display = 'block'
    
    try {
      // 1. Crear Transmisión
      const { data: transData, error: transErr } = await supabase.from('transmisiones')
        .insert({
          mesa_id: draftPayload.mesa_id,
          usuario_id: draftPayload.usuario_id,
          imagen_acta_url: 'https://ejemplo.com/acta_uploaded.jpg', // TODO: Integrar subida real SD
          es_valida: true
        })
        .select('id').single()

      if (transErr) throw transErr
      const transmisionId = transData.id

      // 2. Insertar Resultados
      const resultadosConTransmision = draftPayload.resultados.map(r => ({ ...r, transmision_id: transmisionId }))
      const { error: resErr } = await supabase.from('resultados_transmision').insert(resultadosConTransmision)
      if (resErr) throw resErr

      // 3. Insertar Votos Especiales
      const { error: espErr } = await supabase.from('votos_especiales').insert({
        transmision_id: transmisionId,
        votos_blancos: draftPayload.vBlancos,
        votos_nulos: draftPayload.vNulos,
        votos_validos: draftPayload.vValidos
      })
      if (espErr) throw espErr

      // 4. Actualizar estado mesa
      await supabase.from('mesas').update({ estado: 'transmitida' }).eq('id', draftPayload.mesa_id)

      // ÉXITO
      loading.style.display = 'none'
      step3.innerHTML = `
        <div style="font-size:50px; color:#28a745;">✅</div>
        <h2>¡Transmisión Exitosa!</h2>
        <p style="color:#666;">Los resultados se han guardado correctamente en la base de datos oficial.</p>
        <button type="button" id="btn-nueva-transmision" style="margin-top:20px; background:#007bff; color:white; border:none; padding:12px 24px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">
          Enviar otra acta
        </button>
      `
      
      // Reconectar btn
      container.querySelector('#btn-nueva-transmision')?.addEventListener('click', () => {
        formSearch.reset()
        formTransmision.reset()
        errorMesa.textContent = ''
        step3.style.display = 'none'
        step1.style.display = 'block'
        currentMesaId = null
      })

      step3.style.display = 'block'

    } catch (err: any) {
      console.error('Error al transmitir, guardando en LocalStorage:', err)
      
      // Fallback: Guardar en LocalStorage si falla la red o el servidor crashea
      const pendientes = JSON.parse(localStorage.getItem('transmisiones_pendientes') || '[]')
      pendientes.push(draftPayload)
      localStorage.setItem('transmisiones_pendientes', JSON.stringify(pendientes))

      loading.style.display = 'none'
      
      step3.innerHTML = `
        <div style="font-size:50px; color:#ffc107;">⚠️</div>
        <h2>Guardado Localmente</h2>
        <p style="color:#666;">No hay conexión o los servidores están saturados. Los datos se guardaron en tu dispositivo y se sincronizarán en cuanto haya red.</p>
        <button type="button" id="btn-nueva-transmision-offline" style="margin-top:20px; background:#6c757d; color:white; border:none; padding:12px 24px; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">
          Aceptar
        </button>
      `

      // Reconectar btn
      container.querySelector('#btn-nueva-transmision-offline')?.addEventListener('click', () => {
        formSearch.reset()
        formTransmision.reset()
        errorMesa.textContent = ''
        step3.style.display = 'none'
        step1.style.display = 'block'
        currentMesaId = null
      })

      step3.style.display = 'block'
    } finally {
      submitBtn.disabled = false // Se libera el bloqueo
    }
  })
}

export default createVeedorView
