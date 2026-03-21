// @ts-nocheck
// Supabase Edge Function: create-user
// Crea un usuario en auth.users + inserta en la tabla usuarios
// Se invoca desde el frontend con: supabase.functions.invoke('create-user', { body: {...} })
// Usa la SERVICE_ROLE key internamente (nunca expuesta al cliente)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Responder a preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase Admin client con service_role (solo disponible en el servidor)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verificar que la petición viene de un usuario autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar el token del usuario que hace la petición
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar que el caller tiene un rol que puede crear usuarios
    const { data: callerData } = await supabaseAdmin
      .from('usuarios')
      .select('rol, distrito_id, recinto_id')
      .eq('auth_id', caller.id)
      .single()

    const rolesPermitidos = ['admin', 'supervisor2', 'supervisor1']
    if (!callerData || !rolesPermitidos.includes(callerData.rol)) {
      return new Response(JSON.stringify({ error: 'Sin permisos para crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Leer datos del nuevo usuario
    const body = await req.json()
    const { email, password, nombre, apellido, rol, distrito_id, recinto_id } = body

    if (!email || !password || !nombre || !apellido || !rol) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos: email, password, nombre, apellido, rol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar jerarquía: supervisor2 solo puede crear supervisor1 y veedor
    // supervisor1 solo puede crear veedor
    const jerarquia: Record<string, string[]> = {
      admin: ['admin', 'supervisor2', 'supervisor1', 'veedor'],
      supervisor2: ['supervisor1', 'veedor'],
      supervisor1: ['veedor'],
    }
    if (!jerarquia[callerData.rol]?.includes(rol)) {
      return new Response(JSON.stringify({ error: `No puedes crear usuarios con rol ${rol}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Crear usuario en Supabase Auth (sin confirmación de email)
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmar automáticamente, sin email
    })

    if (authError || !newAuthUser.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? 'Error creando usuario en Auth' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Insertar en la tabla usuarios
    const { data: newUsuario, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_id: newAuthUser.user.id,
        nombre,
        apellido,
        email,
        rol,
        creado_por: callerData ? (await supabaseAdmin
          .from('usuarios')
          .select('id')
          .eq('auth_id', caller.id)
          .single()).data?.id : null,
        distrito_id: distrito_id ?? null,
        recinto_id: recinto_id ?? null,
      })
      .select('id, email, rol, nombre, apellido')
      .single()

    if (dbError) {
      // Revertir: eliminar el usuario de auth si falla la inserción en BD
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, usuario: newUsuario }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
