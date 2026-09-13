const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const processorSecret = Deno.env.get('ACCESS_RECOVERY_CLEANUP_SECRET')
  if (!url || !serviceKey || !processorSecret) return json({ error: 'Server configuration error' }, 500)
  if (req.headers.get('x-access-recovery-cleanup-secret') !== processorSecret) return json({ error: 'Not authorised' }, 401)

  // Expiry revokes access; it is not a customer erasure request. Do not claim
  // jobs, mark records deleted, remove storage, or anonymize account content.
  // Historical genuine-erasure requests remain a separate reviewed workflow.
  return json({ processed: 0, completed: 0, failed: 0, disabled: true,
    reason: 'Automatic account deletion on access expiry is disabled; customer content is retained.' })
})
