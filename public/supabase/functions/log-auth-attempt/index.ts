// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const email = (body?.email ?? '').toString().trim().toLowerCase()
    const status = (body?.status ?? '').toString().trim().toLowerCase()
    const reason = (body?.reason ?? '').toString().trim()
    const userId = Number.isFinite(body?.userId) ? Number(body.userId) : null

    if (!email || (status !== 'success' && status !== 'failed')) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null

    const { error } = await supabaseAdmin
      .from('bitacora_requests')
      .insert({
        usuario_id: userId,
        metodo: 'AUTH',
        endpoint: '/auth/sign-in',
        payload: {
          email,
          status,
          reason: reason || null,
        },
        ip_origen: forwardedFor,
        status_code: status === 'success' ? 200 : 401,
      })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
