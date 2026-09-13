import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parsePhoneNumberFromString } from 'npm:libphonenumber-js@1.13.12'
import { sendPlatformSms } from '../_shared/platformSms.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const normalizePhone = (raw: string) => {
  const parsed = parsePhoneNumberFromString(raw.trim(), { defaultCountry: 'AU', extract: false })
  if (!parsed?.isValid()) throw new Error('Enter a valid mobile number, including its country code if outside Australia.')
  return parsed.number
}

const maskPhone = (phone: string) => phone.length < 6
  ? '••••'
  : `${phone.slice(0, 3)}••••${phone.slice(-3)}`

Deno.serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) return respond({ error: 'Server configuration error' }, 500)

  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Unauthorized' }, 401)
  const token = authorization.slice(7)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !authData.user) return respond({ error: 'Unauthorized' }, 401)
  const userId = authData.user.id

  const { data: operational } = await userClient.rpc('is_account_operational', { p_user_id: userId })
  if (operational !== true) return respond({ error: 'Account access is closed' }, 403)

  let input: { action?: string; event_id?: string; mobile?: string; code?: string }
  try { input = await req.json() } catch { return respond({ error: 'Invalid request' }, 400) }
  if (!input.event_id) return respond({ error: 'event_id is required' }, 400)

  const { data: event, error: eventError } = await userClient.from('events')
    .select('id,user_id')
    .eq('id', input.event_id)
    .maybeSingle()
  if (eventError || !event) return respond({ error: 'Event not found or unavailable' }, 403)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const isOwner = event.user_id === userId
  const { data: verification } = await admin.from('organiser_phone_verifications')
    .select('phone_e164,verified_at')
    .eq('user_id', event.user_id)
    .maybeSingle()
  const { data: preference } = await admin.from('guest_addition_notification_preferences')
    .select('sms_enabled')
    .eq('event_id', event.id)
    .maybeSingle()

  if (input.action === 'status') {
    const { data: profile } = isOwner
      ? await admin.from('profiles').select('mobile').eq('id', userId).maybeSingle()
      : { data: null }
    return respond({
      ownerCanVerify: isOwner,
      verified: Boolean(verification),
      maskedPhone: verification && isOwner ? maskPhone(verification.phone_e164) : null,
      savedMobile: isOwner ? profile?.mobile || '' : null,
      smsEnabled: preference?.sms_enabled === true,
    })
  }

  if (!isOwner) return respond({ error: 'Only the event owner can verify or change the alert mobile number.' }, 403)

  if (input.action === 'request') {
    const { data: profile } = await admin.from('profiles').select('mobile').eq('id', userId).maybeSingle()
    let phone: string
    try { phone = normalizePhone(input.mobile || profile?.mobile || '') }
    catch (error) { return respond({ error: error instanceof Error ? error.message : 'Enter a valid mobile number.' }, 400) }

    const fingerprintSource = `${req.headers.get('x-forwarded-for') || 'unknown'}|${req.headers.get('user-agent') || 'unknown'}|${serviceKey}`
    const fingerprint = await sha256(fingerprintSource)
    if (profile?.mobile !== phone) {
      const { error: profileError } = await admin.from('profiles').update({ mobile: phone }).eq('id', userId)
      if (profileError) return respond({ error: 'Could not update the saved mobile number.' }, 500)
    }

    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    const code = String(100000 + (random[0] % 900000))
    const codeHash = await sha256(`${code}|${userId}|${phone}|${serviceKey}`)
    const { data: challengeId, error: reserveError } = await admin.rpc('reserve_organiser_phone_otp_challenge', {
      _user_id: userId,
      _event_id: event.id,
      _phone_e164: phone,
      _code_hash: codeHash,
      _request_fingerprint: fingerprint,
    })
    if (reserveError || !challengeId) {
      if (reserveError?.message?.includes('rate_limit_wait')) return respond({ error: 'Please wait before requesting another code.' }, 429)
      if (reserveError?.message?.includes('rate_limit_exceeded')) return respond({ error: 'Too many verification requests. Please try again later.' }, 429)
      return respond({ error: 'Could not create a verification code.' }, 500)
    }

    const sms = await sendPlatformSms(phone, `Wedding Waitress verification code: ${code}. Expires in 10 minutes.`)
    if (!sms.accepted) {
      await admin.from('organiser_phone_otp_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challengeId)
      return respond({ error: 'The verification message could not be sent. Please try again.' }, 502)
    }
    await admin.from('organiser_phone_otp_challenges').update({ provider_id: sms.providerId || null }).eq('id', challengeId)
    return respond({ providerAccepted: true, maskedPhone: maskPhone(phone), expiresInSeconds: 600 })
  }

  if (input.action === 'verify') {
    if (!input.code || !/^\d{6}$/.test(input.code)) return respond({ error: 'Enter the complete six-digit code.' }, 400)
    const { data: challenge } = await admin.from('organiser_phone_otp_challenges')
      .select('id,phone_e164,code_hash,attempts,expires_at')
      .eq('user_id', userId)
      .eq('event_id', event.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!challenge) return respond({ error: 'No active code. Request a new one.' }, 400)
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await admin.from('organiser_phone_otp_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challenge.id)
      return respond({ error: 'That code has expired. Request a new one.' }, 400)
    }
    if (challenge.attempts >= 5) return respond({ error: 'Too many attempts. Request a new code.' }, 429)

    const submittedHash = await sha256(`${input.code}|${userId}|${challenge.phone_e164}|${serviceKey}`)
    if (submittedHash !== challenge.code_hash) {
      const attempts = challenge.attempts + 1
      await admin.from('organiser_phone_otp_challenges').update({
        attempts,
        ...(attempts >= 5 ? { consumed_at: new Date().toISOString() } : {}),
      }).eq('id', challenge.id).eq('attempts', challenge.attempts).is('consumed_at', null)
      return respond({ error: attempts >= 5 ? 'Too many attempts. Request a new code.' : 'That code is incorrect.' }, attempts >= 5 ? 429 : 400)
    }

    const { data: consumed } = await admin.from('organiser_phone_otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)
      .eq('attempts', challenge.attempts)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle()
    if (!consumed) return respond({ error: 'This code has already been used.' }, 409)

    const { data: currentProfile } = await admin.from('profiles').select('mobile').eq('id', userId).maybeSingle()
    let currentPhone = ''
    try { currentPhone = normalizePhone(currentProfile?.mobile || '') } catch { /* handled below */ }
    if (currentPhone !== challenge.phone_e164) return respond({ error: 'The saved mobile number changed. Request a new code.' }, 409)

    const { error: verifyError } = await admin.from('organiser_phone_verifications').upsert({
      user_id: userId,
      phone_e164: challenge.phone_e164,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (verifyError) return respond({ error: 'Could not save mobile verification.' }, 500)
    const { error: preferenceError } = await admin.from('guest_addition_notification_preferences').upsert({
      event_id: event.id,
      sms_enabled: true,
      updated_at: new Date().toISOString(),
    })
    if (preferenceError) return respond({ error: 'Mobile verified, but the SMS alert preference was not saved.' }, 500)
    return respond({ verified: true, smsEnabled: true, maskedPhone: maskPhone(challenge.phone_e164) })
  }

  return respond({ error: 'Unknown action' }, 400)
})
