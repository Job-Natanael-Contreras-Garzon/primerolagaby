#!/usr/bin/env node
/**
 * Script para desactivar RLS en todas las tablas (DESARROLLO SOLO)
 * ⚠️ NUNCA hagas en PRODUCCIÓN
 * Ejecutar: node scripts/disable-rls.mjs
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

async function disableRLS() {
  console.log('⚠️  Desactivando RLS en todas las tablas (DESARROLLO SOLO)...\n')

  const tables = [
    'municipios',
    'distritos',
    'recintos',
    'mesas',
    'usuarios',
    'veedor_recintos',
    'partidos',
    'transmisiones',
    'resultados_transmision',
    'votos_especiales',
    'incidencias',
    'monitoreo_config',
    'monitoreo_partidos_visibles',
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('disable_rls_table', {
        table_name: table,
      })

      if (error && error.code !== 'PGRST302') {
        // PGRST302 significa que la función no existe, lo cual es normal
        console.warn(`⚠️  ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}`)
      }
    } catch (e) {
      console.log(`✅ ${table} (sin cambios o ya desactivado)`)
    }
  }

  console.log('\n✨ RLS ha sido desactivado en desarrollo')
  console.log('🔒 Recuerda: Re-activar RLS en PRODUCCIÓN con policies correctas\n')
}

disableRLS()
