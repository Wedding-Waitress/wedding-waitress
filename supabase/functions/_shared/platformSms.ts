export interface PlatformSmsResult {
  accepted: boolean
  providerId?: string
  error?: string
}

// Platform-paid operational SMS, deliberately isolated from customer metering.
export async function sendPlatformSms(to: string, body: string): Promise<PlatformSmsResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
  const phone = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!sid || !token || (!messagingServiceSid && !phone)) {
    return { accepted: false, error: 'SMS provider not configured' }
  }

  const form = new URLSearchParams({ To: to, Body: body })
  if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid)
  else if (phone) form.set('From', phone)

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const result = await response.json().catch(() => ({}))
    if (response.ok && typeof result?.sid === 'string') {
      return { accepted: true, providerId: result.sid }
    }
    const code = result?.code == null ? 'unknown_error' : String(result.code)
    return { accepted: false, error: `Twilio rejected request (${response.status}, ${code})` }
  } catch {
    return { accepted: false, error: 'Twilio request failed before acceptance was confirmed' }
  }
}
