#!/usr/bin/env node
/**
 * Script para crear usuarios de prueba en Supabase Auth + tabla usuarios
 * Ejecutar: node scripts/create-test-users.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Cargar variables de .env
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL || 'https://jnqjrsujjhpanglkhacw.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_l9jejASzyEBZ05DI4l7lFw_f-biRJEO'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada')
  console.error('Verifica que tu .env tenga esta variable')
  console.error('Archivo buscado:', envPath)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Usuarios a crear
const testUsers = [
  {
    email: 'admin@electoral.test',
    password: 'Admin123456!',
    nombre: 'Admin',
    apellido: 'Sistema',
    rol: 'admin',
    distrito: null,
    recinto: null,
  },
  {
    email: 'supervisor.distrito@electoral.test',
    password: 'Supervisor123!',
    nombre: 'Carlos',
    apellido: 'Sánchez',
    rol: 'distrito',
    distrito: 'Distrito 01',
    recinto: null,
  },
  {
    email: 'supervisor.recinto@electoral.test',
    password: 'Supervisor123!',
    nombre: 'María',
    apellido: 'González',
    rol: 'colegio',
    distrito: 'Distrito 01',
    recinto: 'Colegio Central',
  },
  {
    email: 'veedor@electoral.test',
    password: 'Veedor123!',
    nombre: 'Juan',
    apellido: 'Pérez',
    rol: 'veedor',
    distrito: null,
    recinto: null,
  },
]

async function createTestUsers() {
  console.log('🚀 Creando usuarios de prueba...\n')

  for (const user of testUsers) {
    try {
      // 1. Crear en Supabase Auth
      console.log(`📝 Creando ${user.rol}: ${user.email}...`)

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.warn(`⚠️  El usuario ${user.email} ya existe. Saltando...`)
          continue
        }
        throw authError
      }

      console.log(`  ✅ Usuario creado en Auth: ${authUser.user?.id}`)

      // 2. Obtener IDs de distrito y recinto
      let distritoId = null
      let recintoId = null

      if (user.distrito) {
        const { data: distData, error: distError } = await supabase
          .from('distritos')
          .select('id')
          .ilike('nombre', user.distrito)
          .single()

        if (distError) console.warn(`  ⚠️  No se encontró el distrito: ${user.distrito}`)
        else distritoId = distData?.id
      }

      if (user.recinto) {
        const { data: recData, error: recError } = await supabase
          .from('recintos')
          .select('id')
          .ilike('nombre', user.recinto)
          .single()

        if (recError) console.warn(`  ⚠️  No se encontró el recinto: ${user.recinto}`)
        else recintoId = recData?.id
      }

      // 3. Insertar en tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          auth_id: authUser.user?.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          rol: user.rol,
          distrito_id: distritoId,
          recinto_id: recintoId,
          activo: true,
        })
        .select()
        .single()

      if (usuarioError) throw usuarioError

      console.log(`  ✅ Registro creado en tabla usuarios: ${usuarioData?.id}\n`)
    } catch (error) {
      console.error(`❌ Error creando ${user.email}:`, error.message)
    }
  }

  console.log('✨ Proceso completado!\n')

  console.log('════════════════════════════════════════════')
  console.log('📋 CREDENCIALES DE PRUEBA')
  console.log('════════════════════════════════════════════\n')

  testUsers.forEach((user) => {
    console.log(`${user.rol.toUpperCase()}:`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Contraseña: ${user.password}`)
    console.log(`  Rol: ${user.rol}`)
    if (user.distrito) console.log(`  Acceso: ${user.distrito}${user.recinto ? ` - ${user.recinto}` : ''}`)
    console.log()
  })

  console.log('════════════════════════════════════════════')
  console.log('Para usar en desarrollo:')
  console.log('1. Abierto http://localhost:5174')
  console.log('2. Haz clic en "Login de Acceso"')
  console.log('3. Usa la combinación email/contraseña de arriba')
  console.log('════════════════════════════════════════════\n')
}

createTestUsers().catch(console.error)
