import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const suppliedSecret = req.headers.get('x-transactional-email-processor-secret')
  const processorSecret = Deno.env.get('TRANSACTIONAL_EMAIL_PROCESSOR_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!processorSecret || !suppliedSecret || suppliedSecret !== processorSecret) return json({ error: 'Unauthorized' }, 401)
  if (!supabaseUrl || !serviceKey || !resendKey) return json({ error: 'Server configuration error' }, 500)

  let queueId: number
  try {
    const body = await req.json()
    queueId = Number(body.queueId)
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!Number.isSafeInteger(queueId) || queueId <= 0) return json({ error: 'Invalid queue id' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: claimed, error: claimError } = await admin.rpc('claim_transactional_email', { p_queue_id: queueId })
  const item = Array.isArray(claimed) ? claimed[0] : claimed
  if (claimError || !item) return json({ error: 'Email queue item is unavailable' }, 409)

  const payload = item.payload as Record<string, unknown>
  const messageId = String(payload.message_id || '')
  const recipient = String(payload.to || '').trim().toLowerCase()
  try {
    const { data: audit, error: auditError } = await admin.from('email_send_log').select('purpose,customer_id').eq('message_id', messageId).single()
    const { data: suppression, error: suppressionError } = await admin.from('suppressed_emails').select('reason').eq('email', recipient).maybeSingle()
    if (auditError || suppressionError || !audit) throw new Error('Email eligibility could not be verified')
    if (suppression && (suppression.reason !== 'unsubscribe' || audit.purpose === 'promotional')) throw new Error('Recipient is suppressed')
    if (audit.purpose === 'promotional') {
      const { data: eligible, error } = await admin.rpc('marketing_email_eligible', { p_user_id: audit.customer_id, p_email: recipient })
      if (error || eligible !== true) throw new Error('Explicit marketing consent is required')
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': messageId },
      body: JSON.stringify({
        from: payload.from,
        reply_to: payload.reply_to,
        to: [recipient],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers: payload.unsubscribe_token ? {
          'List-Unsubscribe': `<${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(String(payload.unsubscribe_token))}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        } : undefined,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)

    if (typeof result?.id !== 'string' || !result.id) throw new Error('Email provider acknowledgement is missing')
    const { data: acknowledged, error } = await admin.rpc('acknowledge_email_acceptance', {
      p_queue_id: queueId, p_message_id: messageId, p_provider_message_id: result.id,
    })
    if (error || acknowledged !== true) throw new Error('Email acknowledgement could not be recorded')
    return json({ success: true, accepted: true, delivered: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delivery failed'
    await admin.rpc('complete_transactional_email', { p_queue_id: queueId, p_success: false, p_error: message })
    if (messageId) await admin.from('email_send_log').update({ status: 'failed', error_message: message }).eq('message_id', messageId).eq('status', 'pending')
    console.error('Transactional email acceptance failed', { queueId, error: message })
    return json({ error: 'The email provider rejected the message' }, 502)
  }
})
