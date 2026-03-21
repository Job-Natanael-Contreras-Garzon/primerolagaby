#!/usr/bin/env node
/**
 * Script para cargar datos de prueba en Supabase
 * Ejecutar: node scripts/seed-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

let envVars = {}
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      if (key && value) {
        envVars[key.trim()] = value.trim()
      }
    }
  })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey || !supabaseUrl) {
  console.error('❌ Error: Variables de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedData() {
  console.log('🌱 Cargando datos de prueba...\n')

  try {
    // 1. Crear municipio
    console.log('📍 Creando municipio...')
    const { data: municipioData, error: munError } = await supabase
      .from('municipios')
      .select('id')
      .eq('nombre', 'Santa Cruz')
      .single()

    let municipioId = municipioData?.id

    if (!municipioId) {
      const { data: newMun, error: munInsertError } = await supabase
        .from('municipios')
        .insert({ nombre: 'Santa Cruz', departamento: 'Santa Cruz', activo: true })
        .select('id')
        .single()

      if (munInsertError) throw munInsertError
      municipioId = newMun?.id
      console.log(`  ✅ Municipio creado: ${municipioId}`)
    } else {
      console.log(`  ✅ Municipio ya existe: ${municipioId}`)
    }

    // 2. Crear distritos
    console.log('📍 Creando distritos...')
    const distritos = [
      { nombre: 'Distrito 01', numero: 1 },
      { nombre: 'Distrito 02', numero: 2 },
      { nombre: 'Distrito 03', numero: 3 },
    ]

    const distritosMap = {}
    for (const distrito of distritos) {
      const { data: existingDist } = await supabase
        .from('distritos')
        .select('id')
        .eq('nombre', distrito.nombre)
        .single()

      if (existingDist?.id) {
        distritosMap[distrito.numero] = existingDist.id
        console.log(`  ✅ ${distrito.nombre} ya existe`)
      } else {
        const { data: newDist, error: distError } = await supabase
          .from('distritos')
          .insert({
            nombre: distrito.nombre,
            numero_distrito: distrito.numero,
            municipio_id: municipioId,
            activo: true,
          })
          .select('id')
          .single()

        if (distError) throw distError
        distritosMap[distrito.numero] = newDist?.id
        console.log(`  ✅ ${distrito.nombre} creado`)
      }
    }

    // 3. Crear recintos
    console.log('📍 Creando recintos (colegios)...')
    const recintos = [
      { nombre: 'Colegio Central', distrito: 1, direccion: 'Av. Principal 123', lat: -17.8252, lng: -63.1629 },
      { nombre: 'Colegio Las Palmas', distrito: 1, direccion: 'Calle Las Palmas 456', lat: -17.83, lng: -63.17 },
      { nombre: 'Colegio San Martin', distrito: 2, direccion: 'Av. San Martin 789', lat: -17.835, lng: -63.175 },
      { nombre: 'Instituto Técnico', distrito: 3, direccion: 'Calle Técnica 111', lat: -17.84, lng: -63.18 },
    ]

    const recintosMap = {}
    for (const recinto of recintos) {
      const { data: existingRec } = await supabase
        .from('recintos')
        .select('id')
        .eq('nombre', recinto.nombre)
        .single()

      if (existingRec?.id) {
        recintosMap[recinto.nombre] = existingRec.id
        console.log(`  ✅ ${recinto.nombre} ya existe`)
      } else {
        const { data: newRec, error: recError } = await supabase
          .from('recintos')
          .insert({
            nombre: recinto.nombre,
            direccion: recinto.direccion,
            distrito_id: distritosMap[recinto.distrito],
            lat: recinto.lat,
            lng: recinto.lng,
            activo: true,
          })
          .select('id')
          .single()

        if (recError) throw recError
        recintosMap[recinto.nombre] = newRec?.id
        console.log(`  ✅ ${recinto.nombre} creado`)
      }
    }

    // 4. Crear mesas
    console.log('📍 Creando mesas de votación...')
    const mesasConfig = [
      { numero: 'M001A', recinto: 'Colegio Central', habilitados: 120 },
      { numero: 'M001B', recinto: 'Colegio Central', habilitados: 125 },
      { numero: 'M002A', recinto: 'Colegio Central', habilitados: 118 },
      { numero: 'M001A', recinto: 'Colegio Las Palmas', habilitados: 115 },
      { numero: 'M001A', recinto: 'Colegio San Martin', habilitados: 122 },
      { numero: 'M001A', recinto: 'Instituto Técnico', habilitados: 130 },
    ]

    let mesasCreadas = 0
    for (const mesaConf of mesasConfig) {
      const { data: existingMesa } = await supabase
        .from('mesas')
        .select('id')
        .eq('numero_mesa', mesaConf.numero)
        .eq('recinto_id', recintosMap[mesaConf.recinto])
        .single()

      if (!existingMesa?.id) {
        const { error: mesaError } = await supabase
          .from('mesas')
          .insert({
            numero_mesa: mesaConf.numero,
            recinto_id: recintosMap[mesaConf.recinto],
            total_habilitados: mesaConf.habilitados,
            estado: 'pendiente',
            activo: true,
          })

        if (mesaError) throw mesaError
        mesasCreadas++
      }
    }
    console.log(`  ✅ ${mesasCreadas} mesas creadas`)

    // 5. Crear partidos
    console.log('📍 Creando partidos...')
    const partidos = [
      { nombre: 'Frente Progresista', sigla: 'FP', color: '#e6008e' },
      { nombre: 'Alianza Democrática', sigla: 'AD', color: '#00b4d8' },
      { nombre: 'Movimiento Ciudadano', sigla: 'MC', color: '#ffc300' },
      { nombre: 'Unidad Popular', sigla: 'UP', color: '#ff6b6b' },
      { nombre: 'Agrupación Independiente', sigla: 'AI', color: '#6f42c1' },
    ]

    let partidosCreados = 0
    for (const partido of partidos) {
      const { data: existingPart } = await supabase
        .from('partidos')
        .select('id')
        .eq('sigla', partido.sigla)
        .single()

      if (!existingPart?.id) {
        const { error: partError } = await supabase
          .from('partidos')
          .insert({
            nombre: partido.nombre,
            sigla: partido.sigla,
            color_hex: partido.color,
            activo: true,
          })

        if (partError) throw partError
        partidosCreados++
      }
    }
    console.log(`  ✅ ${partidosCreados} partidos creados\n`)

    console.log('✨ Datos de prueba cargados exitosamente!')
  } catch (error) {
    console.error('❌ Error cargando datos:', error.message)
    process.exit(1)
  }
}

seedData()
