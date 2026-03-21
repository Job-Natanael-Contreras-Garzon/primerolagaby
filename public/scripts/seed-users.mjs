import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const seedFile = process.argv[2] ?? 'supabase/seed_users.json'
const seedPath = path.resolve(process.cwd(), seedFile)

if (!fs.existsSync(seedPath)) {
  console.error(`No existe archivo de seed: ${seedPath}`)
  process.exit(1)
}

const raw = fs.readFileSync(seedPath, 'utf-8')
const payload = JSON.parse(raw)

const defaults = payload.defaults ?? {}
const users = payload.users ?? []

if (!Array.isArray(users) || users.length === 0) {
  console.error('El archivo de seed no contiene usuarios')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const normalize = (value) => (value ?? '').toString().trim().toLowerCase()

async function listAllAuthUsers() {
  let page = 1
  const perPage = 200
  const all = []

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const current = data?.users ?? []
    all.push(...current)

    if (current.length < perPage) break
    page += 1
  }

  return all
}

async function resolveDistrictMap() {
  const { data, error } = await admin
    .from('distritos')
    .select('id, numero_distrito, municipios(nombre)')

  if (error) throw error

  const map = new Map()
  for (const row of data ?? []) {
    const municipioNombre = row.municipios?.nombre ?? 'Santa Cruz de la Sierra'
    const key = `${row.numero_distrito}|${normalize(municipioNombre)}`
    map.set(key, row.id)
  }
  return map
}

async function resolveRecintoId(recintoNombre, distritoId) {
  if (!recintoNombre || !distritoId) return null

  const { data, error } = await admin
    .from('recintos')
    .select('id, nombre')
    .eq('distrito_id', distritoId)

  if (error) throw error

  const match = (data ?? []).find((r) => normalize(r.nombre) === normalize(recintoNombre))
  return match?.id ?? null
}

async function upsertPerfil({ authId, user, distritoId, recintoId, creadoPorId }) {
  const { data, error } = await admin
    .from('usuarios')
    .upsert(
      {
        auth_id: authId,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        creado_por: creadoPorId,
        distrito_id: distritoId,
        recinto_id: recintoId,
        activo: true,
      },
      { onConflict: 'email' },
    )
    .select('id, email, rol')
    .single()

  if (error) throw error
  return data
}

async function ensureAuthUser(email, password) {
  const authUsers = await listAllAuthUsers()
  const found = authUsers.find((item) => normalize(item.email) === normalize(email))

  if (found) {
    if (password) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { password })
      if (updateError) throw updateError
    }
    return found.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw error ?? new Error('No se pudo crear usuario en auth.users')
  }

  return data.user.id
}

async function main() {
  console.log(`Usando seed: ${seedFile}`)

  const districtMap = await resolveDistrictMap()
  let adminUsuarioId = null

  const ordered = [
    ...users.filter((u) => u.rol === 'admin'),
    ...users.filter((u) => u.rol !== 'admin'),
  ]

  for (const user of ordered) {
    const password = user.password ?? defaults.password
    if (!user.email || !password || !user.nombre || !user.apellido || !user.rol) {
      console.warn(`Saltado (faltan campos): ${JSON.stringify(user)}`)
      continue
    }

    const municipio = user.municipio ?? defaults.municipio ?? 'Santa Cruz de la Sierra'
    const distritoNumero = user.distrito_numero ?? null

    let distritoId = null
    if (distritoNumero !== null) {
      distritoId = districtMap.get(`${distritoNumero}|${normalize(municipio)}`) ?? null
      if (!distritoId) {
        console.warn(`No se encontró distrito ${distritoNumero} en ${municipio} para ${user.email}`)
      }
    }

    const recintoId = await resolveRecintoId(user.recinto_nombre ?? null, distritoId)
    if (user.recinto_nombre && !recintoId) {
      console.warn(`No se encontró recinto "${user.recinto_nombre}" para ${user.email}`)
    }

    const authId = await ensureAuthUser(user.email, password)
    const perfil = await upsertPerfil({
      authId,
      user,
      distritoId,
      recintoId,
      creadoPorId: user.rol === 'admin' ? null : adminUsuarioId,
    })

    if (user.rol === 'admin' && !adminUsuarioId) {
      adminUsuarioId = perfil.id
    }

    console.log(`OK: ${perfil.email} (${perfil.rol})`)
  }

  console.log('Seed de usuarios finalizado')
}

main().catch((error) => {
  console.error('Error en seed-users:', error.message)
  process.exit(1)
})
