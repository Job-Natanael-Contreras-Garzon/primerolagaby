#!/usr/bin/env node
/**
 * Script para aplicar migration de roles
 * Cambiar supervisor2 → distrito, supervisor1 → colegio
 * Ejecutar: node scripts/migrate-roles.mjs
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

async function migrateRoles() {
  console.log('🔄 Migrando roles de usuarios...\n')

  try {
    // 1. Actualizar supervisor2 → distrito
    console.log('📝 Actualizando supervisor2 → distrito...')
    const { error: err1 } = await supabase
      .from('usuarios')
      .update({ rol: 'distrito' })
      .eq('rol', 'supervisor2')

    if (err1 && err1.code !== 'PGRST301') {
      throw err1
    }
    console.log('  ✅ supervisor2 actualizado a distrito')

    // 2. Actualizar supervisor1 → colegio
    console.log('📝 Actualizando supervisor1 → colegio...')
    const { error: err2 } = await supabase
      .from('usuarios')
      .update({ rol: 'colegio' })
      .eq('rol', 'supervisor1')

    if (err2 && err2.code !== 'PGRST301') {
      throw err2
    }
    console.log('  ✅ supervisor1 actualizado a colegio\n')

    console.log('✨ Migration completada!')
    console.log('\n📋 Nuevos roles:')
    console.log('  - admin')
    console.log('  - distrito (Supervisor de Distrito)')
    console.log('  - colegio (Responsable de Colegio)')
    console.log('  - veedor (Delegado/Veedor)\n')
  } catch (error) {
    console.error('❌ Error en migration:', error.message)
    process.exit(1)
  }
}

migrateRoles()
