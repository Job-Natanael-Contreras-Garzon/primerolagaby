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
  {
    email: 'lector@electoral.test',
    password: 'Lector123!',
    nombre: 'Roberto',
    apellido: 'Carrasco',
    rol: 'lector',
    distrito: null,
    recinto: null,
  },
]

async function ensureRolExists(rol) {
  console.log(`🔍 Verificando si el rol '${rol}' existe...`)
  
  // Intentar insertar un usuario de prueba con el rol
  try {
    const { data: insertResult, error: insertError } = await supabase
      .from('usuarios')
      .insert({ 
        email: `test-rol-${rol}-${Date.now()}@test.test`, 
        rol: rol, 
        nombre: 'Test', 
        apellido: 'Test', 
        activo: false 
      })
      .select()
    
    // Si se insertó, eliminar el registro de prueba
    if (insertResult && insertResult.length > 0) {
      await supabase.from('usuarios').delete().eq('email', `test-rol-${rol}-${Date.now()}@test.test`)
      console.log(`✅ Rol '${rol}' verificado\n`)
      return true
    }
    
    // Si da error sobre constraint, el rol no existe
    if (insertError && insertError.message && insertError.message.includes('violates check constraint')) {
      console.log(`⚠️  Rol '${rol}' no existe en CHECK constraint\n`)
      return false
    }
    
    if (insertError) {
      console.log(`⚠️  Error al verificar rol (asumiendo que existe): ${insertError.message}\n`)
      return true
    }
    
  } catch (error) {
    console.log(`✅ Rol '${rol}' parece existir\n`)
    return true
  }
}

async function ensureUserInTable(authId, email, nombre, apellido, rol) {
  console.log(`🔍 Verificando si ${email} existe en tabla usuarios...`)
  
  const { data: existingUser, error: searchError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .single()
  
  if (existingUser) {
    console.log(`  ⚠️  El usuario ya existe en tabla usuarios: ${existingUser.id}\n`)
    return true
  }
  
  if (searchError && searchError.code !== 'PGRST116') {
    console.warn(`  ⚠️  Error al buscar usuario:`, searchError.message)
  }
  
  // Insertar el usuario
  console.log(`  📝 Insertando ${email} en tabla usuarios...`)
  const { data: insertedUser, error: insertError } = await supabase
    .from('usuarios')
    .insert({
      auth_id: authId,
      email: email,
      nombre: nombre,
      apellido: apellido,
      rol: rol,
      activo: true,
      distrito_id: null,
      recinto_id: null,
    })
    .select()
    .single()
  
  if (insertError) {
    if (insertError.message.includes('violates check constraint')) {
      console.error(`  ❌ El rol '${rol}' no existe en la CHECK constraint de usuarios`)
      console.error(`     Necesita agregarse en Supabase SQL Editor`)
      return false
    }
    throw insertError
  }
  
  console.log(`  ✅ Usuario insertado en tabla usuarios: ${insertedUser?.id}\n`)
  return true
}

async function createTestUsers() {
  console.log('🚀 Creando usuarios de prueba...\n')

  // Primero, solo verificar/crear rol lector y usuario lector
  const lectorUser = testUsers.find(u => u.rol === 'lector')
  
  if (lectorUser) {
    try {
      // 1. Verificar rol lector
      const rolExists = await ensureRolExists('lector')
      
      if (!rolExists) {
        console.error('❌ El rol "lector" no puede crearse automáticamente.')
        console.error('Debes agregarlo manualmente en Supabase SQL Editor:')
        console.error('  ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check;')
        console.error('  ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN (\'admin\', \'supervisor1\', \'supervisor2\', \'veedor\', \'lector\'));')
        process.exit(1)
      }
      
      // 2. Verificar si el usuario lector existe en Auth
      console.log(`📝 Verificando usuario lector en Auth: ${lectorUser.email}...`)
      
      let lectorAuthId = null
      
      // Intentar crear, pero capturar el error
      let createAttempt = null
      try {
        createAttempt = await supabase.auth.admin.createUser({
          email: lectorUser.email,
          password: lectorUser.password,
          email_confirm: true,
        })
      } catch (createError) {
        createAttempt = { data: null, error: createError }
      }
      
      if (createAttempt.error) {
        const errorMsg = createAttempt.error.message || createAttempt.error.toString() || ''
        
        if (errorMsg.includes('already exists') || errorMsg.includes('already been registered')) {
          console.log(`  ⚠️  El usuario ya existe en Auth. Buscando ID...`)
          
          // Buscar el ID del usuario existente
          const listResult = await supabase.auth.admin.listUsers()
          
          let users = listResult.data?.users || []
          
          const existingLector = users.find(u => u.email === lectorUser.email)
          
          if (existingLector) {
            lectorAuthId = existingLector.id
            console.log(`  ✅ Encontrado en Auth: ${lectorAuthId}`)
          } else {
            throw new Error('No se pudo encontrar el usuario en Auth')
          }
        } else {
          throw createAttempt.error
        }
      } else {
        lectorAuthId = createAttempt.data?.user?.id
        console.log(`  ✅ Usuario creado en Auth: ${lectorAuthId}`)
      }
      
      // 3. Verificar/crear usuario en tabla usuarios
      if (lectorAuthId) {
        const success = await ensureUserInTable(
          lectorAuthId,
          lectorUser.email,
          lectorUser.nombre,
          lectorUser.apellido,
          lectorUser.rol
        )
        
        if (!success) {
          console.error('❌ No se pudo crear el usuario lector en la tabla')
          process.exit(1)
        }
      }
      
    } catch (error) {
      console.error(`❌ Error con usuario lector: ${error.message}`)
      process.exit(1)
    }
  }

  console.log('✨ Usuario lector configurado correctamente!\n')

  console.log('════════════════════════════════════════════════════════════════')
  console.log('📋 CREDENCIALES DE PRUEBA - TODOS LOS USUARIOS')
  console.log('════════════════════════════════════════════════════════════════\n')

  testUsers.forEach((user) => {
    console.log(`🔐 ${user.rol.toUpperCase()}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Contraseña: ${user.password}`)
    if (user.distrito) console.log(`   Acceso: ${user.distrito}${user.recinto ? ` → ${user.recinto}` : ''}`)
    console.log()
  })

  console.log('════════════════════════════════════════════════════════════════')
  console.log('Para usar en desarrollo:')
  console.log('1. Abre http://localhost:5173 en tu navegador')
  console.log('2. Haz clic en "Login de Acceso"')
  console.log('3. Usa cualquier combinación email/contraseña de arriba')
  console.log('════════════════════════════════════════════════════════════════\n')
}

createTestUsers().catch(console.error)
