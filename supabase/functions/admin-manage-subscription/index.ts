import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }
    const userId = claimsData.claims.sub as string

    // Use service role to check admin and perform updates
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Check admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders })
    }

    const { subscription_id, action } = await req.json()

    if (!subscription_id || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters. Need subscription_id and action (approve|reject)' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const updateData = action === 'approve'
      ? { status: 'active', is_read_only: false, updated_at: new Date().toISOString() }
      : { status: 'rejected', is_read_only: true, updated_at: new Date().toISOString() }

    const { data, error } = await adminClient
      .from('user_subscriptions')
      .update(updateData)
      .eq('id', subscription_id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, subscription: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders })
  }
})
