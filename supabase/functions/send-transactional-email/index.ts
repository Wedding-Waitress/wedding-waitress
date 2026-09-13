import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { stableEmailMessageId, supportRateKey } from '../_shared/customer-email-data.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
})
Deno.serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Server configuration error' }, 500)
  let body: Record<string, any>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const templateName = body.templateName || body.template_name, template = TEMPLATES[templateName]
  if (!template) return json({ error: 'Unknown email template' }, 404)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  const internal = bearer === serviceKey
  // Gateway validation accepts anon keys too: validate the actual account.
  // Never authorize using caller-provided IDs or user_metadata.
  const { data: auth } = internal ? { data: { user: null } } : await admin.auth.getUser(bearer)
  const caller = auth.user && !auth.user.is_anonymous ? auth.user : null
  const contact = templateName === 'contact-form-message'
  if (!internal && !contact && (!caller || !['welcome', 'admin-new-signup'].includes(templateName))) return json({ error: 'Authentication required' }, 401)
  const recipient = String(template.to || body.recipientEmail || body.recipient_email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 255) return json({ error: 'Invalid recipient' }, 400)
  if (!internal && templateName === 'welcome' && recipient !== caller?.email?.toLowerCase()) return json({ error: 'Recipient access denied' }, 403)
  // Registry remains transactional only: no campaigns or promotions enabled.
  if (body.purpose && body.purpose !== 'transactional') return json({ error: 'Promotional sending is not enabled' }, 403)
  const templateData = body.templateData && typeof body.templateData === 'object' ? body.templateData : {}
  const key = String(body.idempotencyKey || body.idempotency_key || crypto.randomUUID())
  if (key.length > 200) return json({ error: 'Invalid idempotency key' }, 400)
  let customerId: string | null = caller?.id || null
  const eventId = contact ? body.supportContext?.eventId || null : internal ? body.eventId || null : null
  let ticketId: string | null = null
  if (contact) {
    const name = String(templateData.name || '').trim(), email = String(templateData.email || '').trim().toLowerCase()
    // Compatibility with existing deployed support forms: remove their metadata
    // prefix, but never trust the displayed User ID/Plan for authorization.
    const message = String(templateData.message || '').trim().replace(/^\[Support Category\][^\n]*\n\[Source\][^\n]*\n\[User ID\][^\n]*\n\[Plan\][^\n]*\n\n/, '')
    const category = String(body.supportContext?.category || templateData.eventType || 'General enquiry')
    const source = body.supportContext?.source || 'public_contact'
    if (!name || name.length > 100 || !message || message.length > 2000 || category.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 ||
        !['public_contact', 'get_help', 'account_support'].includes(source)) return json({ error: 'Invalid support request' }, 400)
    if (source !== 'public_contact' && !caller) return json({ error: 'Sign in to submit account support' }, 401)
    const rateKey = await supportRateKey(serviceKey, caller?.id || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown')
    const { data, error } = await admin.rpc('create_support_ticket', {
      p_customer_id: customerId, p_event_id: eventId, p_name: name, p_email: email, p_category: category,
      p_message: message, p_source: source, p_rate_key: rateKey, p_idempotency_key: key,
    })
    if (error) return json({ error: error.code === 'P0001' ? 'Too many support requests. Please try later.' : 'Unable to record support request' }, error.code === 'P0001' ? 429 : 503)
    ticketId = data
  } else if (internal) {
    const { data, error } = await admin.rpc('resolve_email_customer', { p_email: recipient, p_event_id: eventId })
    if (error) return json({ error: 'Unable to verify email linkage' }, 503)
    customerId = data || null
  }
  const messageId = await stableEmailMessageId([ticketId || customerId || 'public', recipient, templateName, key].join(':'))
  const log = { message_id: messageId, template_name: templateName, recipient_email: recipient,
    customer_id: customerId, event_id: eventId, support_ticket_id: ticketId, purpose: 'transactional' }
  const supportSaved = () => json({ success: true, ticketId, recorded: true, accepted: false, delivered: false })
  const { data: suppression, error: suppressionError } = await admin.from('suppressed_emails').select('reason').eq('email', recipient).maybeSingle()
  if (suppressionError) return ticketId ? supportSaved() : json({ error: 'Unable to verify suppression' }, 503)
  // Marketing unsubscribe must not block transactional account/support email.
  if (suppression && suppression.reason !== 'unsubscribe') {
    await admin.from('email_send_log').upsert({ ...log, status: 'suppressed' }, { onConflict: 'message_id', ignoreDuplicates: true })
    return ticketId ? supportSaved() : json({ success: false, reason: 'email_suppressed' })
  }
  const processorSecret = Deno.env.get('TRANSACTIONAL_EMAIL_PROCESSOR_SECRET')
  if (!processorSecret) return ticketId ? supportSaved() : json({ error: 'Email delivery is not configured' }, 503)
  try {
    const html = await renderAsync(React.createElement(template.component, templateData))
    const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
    const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject
    const { error: logError } = await admin.from('email_send_log').upsert({ ...log, status: 'pending' }, { onConflict: 'message_id', ignoreDuplicates: true })
    if (logError) return ticketId ? supportSaved() : json({ error: 'Unable to record email request' }, 503)
    const { data: queueId, error: enqueueError } = await admin.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: {
      message_id: messageId, to: recipient, from: 'Wedding Waitress <support@weddingwaitress.com.au>',
      reply_to: 'support@weddingwaitress.com.au', sender_domain: 'notify.weddingwaitress.com.au',
      subject, html, text, purpose: 'transactional', label: templateName, idempotency_key: messageId,
    } })
    if (enqueueError) return ticketId ? supportSaved() : json({ error: 'Unable to queue email' }, 503)
    const { data: deliveryResult, error: deliveryError } = await admin.functions.invoke('process-transactional-email-queue', {
      body: { queueId }, headers: { 'x-transactional-email-processor-secret': processorSecret },
    })
    if (deliveryError || deliveryResult?.success !== true) return ticketId ? supportSaved() : json({ error: 'Email provider acceptance failed' }, 502)
    return json({ success: true, queued: true, accepted: true, delivered: false, ticketId })
  } catch {
    // No HTML, OTPs, links, raw provider payloads, tokens or secrets in logs.
    console.error('Transactional email preparation failed', { messageId })
    return ticketId ? supportSaved() : json({ error: 'Unable to prepare email' }, 500)
  }
})
