#!/usr/bin/env node
/**
 * Script para configurar RLS policies seguras (PRODUCCIÓN Y DESARROLLO)
 * ✅ Seguro en producción
 * ✅ Permite que la app funcione correctamente
 * Ejecutar: node scripts/setup-rls-policies.mjs
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
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY y VITE_SUPABASE_URL requeridas en .env')
  console.log('\n📋 Instrucciones:')
  console.log('  1. Ve a https://app.supabase.com → [Tu Proyecto] → SQL Editor')
  console.log('  2. Crea nueva query')
  console.log('  3. Copia el contenido de: supabase/03_rls_policies_seguras.sql')
  console.log('  4. Ejecuta (Run)')
  console.log('  5. Después ejecuta este script con la SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupRLSPolicies() {
  console.log('🔐 Configurando RLS policies seguras...\n')

  try {
    // Leer el archivo SQL con las policies
    const sqlPath = path.join(__dirname, '..', 'supabase', '03_rls_policies_seguras.sql')
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Archivo no encontrado: ${sqlPath}`)
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    
    // Dividir en statements individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Ejecutando ${statements.length} sentencias SQL...\n`)

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      try {
        // Usar rpc para ejecutar SQL directo (requiere función auxiliar en Supabase)
        // O ejecutar través del admin client
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        
        if (error && error.code !== 'PGRST102') {
          throw error
        }
        
        successCount++
        console.log('✅', statement.substring(0, 60) + '...')
      } catch (err) {
        errorCount++
        console.log('⚠️ ', err.message)
      }
    }

    console.log(`\n📊 Resultados: ${successCount} exitosas, ${errorCount} errores`)
    
    if (errorCount === 0) {
      console.log('\n✅ RLS policies configuradas correctamente')
      console.log('\n🔒 Permisos activos:')
      console.log('   • ADMIN: ve todo, edita todo')
      console.log('   • SUPERVISOR DISTRITO: ve su distrito y sus mesas')
      console.log('   • SUPERVISOR RECINTO: ve su recinto y sus mesas')
      console.log('   • VEEDOR: puede reportar resultados electorales')
      process.exit(0)
    } else {
      console.log('\n⚠️  Algunos statements fallaron')
      console.log('\n📋 OPCIÓN MANUAL: Ve a Supabase Dashboard')
      console.log('  1. https://app.supabase.com → [Tu Proyecto] → SQL Editor')
      console.log('  2. Crea nueva query')
      console.log('  3. Copia el contenido de: supabase/03_rls_policies_seguras.sql')
      console.log('  4. Ejecuta (Run)')
      process.exit(1)
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.log('\n📋 OPCIÓN MANUAL: Ve a Supabase Dashboard')
    console.log('  1. https://app.supabase.com → [Tu Proyecto] → SQL Editor')
    console.log('  2. Crea nueva query')
    console.log('  3. Copia el contenido de: supabase/03_rls_policies_seguras.sql')
    console.log('  4. Ejecuta (Run)')
    process.exit(1)
  }
}

setupRLSPolicies()
