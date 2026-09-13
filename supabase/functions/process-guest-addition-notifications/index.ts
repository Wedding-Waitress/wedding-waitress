import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildGuestAdditionEmail, guestAdditionEmailIdempotencyKey } from '../_shared/guestAdditionEmail.ts'
import { buildGuestAdditionSms } from '../_shared/guestAdditionSms.ts'
import { sendPlatformSms } from '../_shared/platformSms.ts'
import { beginOperationalEmail, acceptOperationalEmail, failOperationalEmail } from '../_shared/customer-email-data.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const providerError = async (response: Response) => {
  try {
    const body = await response.json()
    const code = typeof body?.name === 'string'
      ? body.name
      : typeof body?.code === 'string' ? body.code : 'unknown_error'
    return `Resend rejected request (${response.status}, ${code})`.slice(0, 500)
  } catch {
    return `Resend rejected request (${response.status})`
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const processorSecret = Deno.env.get('GUEST_ADDITION_PROCESSOR_SECRET')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!url || !serviceKey || !processorSecret || !resendApiKey) {
    return json({ error: 'Server configuration error' }, 500)
  }
  if (req.headers.get('x-guest-addition-processor-secret') !== processorSecret) {
    return json({ error: 'Not authorised' }, 401)
  }

  const db = createClient(url, serviceKey)
  const { data: claimed, error: claimError } = await db.rpc('claim_guest_addition_email_notifications', { _limit: 50 })
  if (claimError) return json({ error: 'Could not claim pending notifications' }, 500)

  let accepted = 0
  let failed = 0
  for (const item of claimed || []) {
    const { data: event, error: eventError } = await db.from('events')
      .select('name,user_id')
      .eq('id', item.event_id)
      .single()
    if (eventError || !event) {
      await db.from('guest_addition_notifications').update({
        email_status: 'failed',
        email_error: 'Event unavailable',
      }).eq('id', item.id).eq('email_status', 'processing')
      failed++
      continue
    }

    const { data: owner } = await db.auth.admin.getUserById(event.user_id)
    if (!owner.user?.email) {
      await db.from('guest_addition_notifications').update({
        email_status: 'failed',
        email_error: 'Event owner email unavailable',
      }).eq('id', item.id).eq('email_status', 'processing')
      failed++
      continue
    }

    const email = buildGuestAdditionEmail({
      eventName: event.name,
      addedByName: item.added_by_name,
      addedGuestName: item.added_guest_name,
      groupChoice: item.group_choice,
      guestId: item.guest_id,
    })
    const idempotencyKey = guestAdditionEmailIdempotencyKey(item.id)

    try {
      await beginOperationalEmail(db, idempotencyKey, 'guest-addition-notification', owner.user.email, event.user_id, item.event_id)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: 'Wedding Waitress <support@weddingwaitress.com.au>',
          reply_to: 'support@weddingwaitress.com.au',
          to: [owner.user.email],
          subject: email.subject,
          html: email.html,
        }),
      })

      if (!response.ok) {
        await failOperationalEmail(db, idempotencyKey)
        await db.from('guest_addition_notifications').update({
          email_status: 'failed',
          email_error: await providerError(response),
        }).eq('id', item.id).eq('email_status', 'processing')
        failed++
        continue
      }

      const result = await response.json().catch(() => ({}))
      await acceptOperationalEmail(db, idempotencyKey, result?.id)
      await db.from('guest_addition_notifications').update({
        // Resend accepted the request. This does not claim inbox delivery.
        email_status: 'queued',
        email_queued_at: new Date().toISOString(),
        email_provider: 'resend',
        email_provider_id: typeof result?.id === 'string' ? result.id : null,
        email_error: null,
      }).eq('id', item.id).eq('email_status', 'processing')
      accepted++
    } catch {
      await failOperationalEmail(db, idempotencyKey)
      await db.from('guest_addition_notifications').update({
        email_status: 'failed',
        email_error: 'Resend request failed before acceptance was confirmed',
      }).eq('id', item.id).eq('email_status', 'processing')
      failed++
    }
  }

  const { data: smsClaimed, error: smsClaimError } = await db.rpc('claim_guest_addition_sms_notifications', { _limit: 50 })
  if (smsClaimError) return json({
    email: { processed: (claimed || []).length, providerAccepted: accepted, failed },
    sms: { error: 'Could not claim pending SMS notifications' },
  }, 500)

  let smsAccepted = 0
  let smsFailed = 0
  for (const item of smsClaimed || []) {
    const { data: event, error: eventError } = await db.from('events')
      .select('name,user_id')
      .eq('id', item.event_id)
      .single()
    if (eventError || !event) {
      await db.from('guest_addition_notifications').update({
        sms_status: 'failed', sms_error: 'Event unavailable',
      }).eq('id', item.id).eq('sms_status', 'processing')
      smsFailed++
      continue
    }

    const { data: phoneVerification } = await db.from('organiser_phone_verifications')
      .select('phone_e164')
      .eq('user_id', event.user_id)
      .maybeSingle()
    const verifiedPhone = phoneVerification?.phone_e164?.trim() || ''
    if (!verifiedPhone || !/^\+[1-9]\d{7,14}$/.test(verifiedPhone)) {
      await db.from('guest_addition_notifications').update({
        sms_status: 'failed', sms_error: 'Event owner verified mobile unavailable',
      }).eq('id', item.id).eq('sms_status', 'processing')
      smsFailed++
      continue
    }

    const result = await sendPlatformSms(verifiedPhone, buildGuestAdditionSms({
      eventName: event.name,
      addedByName: item.added_by_name,
      addedGuestName: item.added_guest_name,
    }))
    await db.from('guest_addition_notifications').update(result.accepted ? {
      // Twilio accepted the message. This does not claim handset delivery.
      sms_status: 'queued',
      sms_queued_at: new Date().toISOString(),
      sms_provider: 'twilio',
      sms_provider_id: result.providerId || null,
      sms_error: null,
    } : {
      sms_status: 'failed',
      sms_error: result.error || 'Twilio acceptance was not confirmed',
    }).eq('id', item.id).eq('sms_status', 'processing')
    result.accepted ? smsAccepted++ : smsFailed++
  }

  return json({
    email: { processed: (claimed || []).length, providerAccepted: accepted, failed },
    sms: { processed: (smsClaimed || []).length, providerAccepted: smsAccepted, failed: smsFailed },
  })
})
