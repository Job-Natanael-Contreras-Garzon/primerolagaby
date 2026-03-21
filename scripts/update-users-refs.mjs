#!/usr/bin/env node
/**
 * Script para actualizar usuarios vinculándolos con distritos y recintos
 * Ejecutar: node scripts/update-users-refs.mjs
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

async function updateUsersRefs() {
  console.log('🔗 Actualizando referencias de usuarios...\n')

  try {
    // Obtener IDs
    const { data: dist01 } = await supabase
      .from('distritos')
      .select('id')
      .eq('nombre', 'Distrito 01')
      .single()

    const { data: colegioC } = await supabase
      .from('recintos')
      .select('id')
      .eq('nombre', 'Colegio Central')
      .single()

    if (!dist01?.id || !colegioC?.id) {
      console.error('❌ No se encontraron distrito o recinto')
      process.exit(1)
    }

    // Actualizar Supervisor de Distrito
    console.log('📝 Actualizando Supervisor de Distrito...')
    const { error: err1 } = await supabase
      .from('usuarios')
      .update({ distrito_id: dist01.id })
      .eq('email', 'supervisor.distrito@electoral.test')

    if (err1) throw err1
    console.log('  ✅ Supervisory de Distrito actualizado')

    // Actualizar Supervisor de Recinto
    console.log('📝 Actualizando Supervisor de Recinto...')
    const { error: err2 } = await supabase
      .from('usuarios')
      .update({ distrito_id: dist01.id, recinto_id: colegioC.id })
      .eq('email', 'supervisor.recinto@electoral.test')

    if (err2) throw err2
    console.log('  ✅ Supervisor de Recinto actualizado')

    console.log('\n✨ Referencias actualizadas correctamente!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

updateUsersRefs()
