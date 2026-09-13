const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
export async function stableEmailMessageId(input: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)))
}
export async function supportRateKey(secret: string, identity: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`support:${identity}`)))
}
// Existing operational senders keep their recipient/content/credit workflow.
// Only durable metadata is added; provider acceptance is not inbox delivery.
export async function beginOperationalEmail(db: any, messageId: string, templateName: string,
  recipient: string, customerId: string, eventId: string): Promise<void> {
  const { error } = await db.from('email_send_log').upsert({ message_id: messageId, template_name: templateName,
    recipient_email: recipient.trim().toLowerCase(), customer_id: customerId, event_id: eventId,
    purpose: 'transactional', status: 'pending' }, { onConflict: 'message_id', ignoreDuplicates: true })
  if (error) throw new Error('Email audit is unavailable before sending')
}
export async function acceptOperationalEmail(db: any, messageId: string, providerId: unknown): Promise<boolean> {
  if (typeof providerId !== 'string' || !providerId) return false
  try {
    const { data, error } = await db.rpc('acknowledge_email_acceptance', {
      p_queue_id: null, p_message_id: messageId, p_provider_message_id: providerId,
    })
    if (!error && data === true) return true
  } catch { /* Provider already accepted: report a pending audit, not failed delivery. */ }
  // Never turn an already accepted send into a refunded/retried new message.
  console.error('Operational email acknowledgement is pending', { messageId })
  return false
}
export async function failOperationalEmail(db: any, messageId: string): Promise<void> {
  await db.from('email_send_log').update({ status: 'failed', error_message: 'Provider acceptance was not confirmed' })
    .eq('message_id', messageId).eq('status', 'pending')
}
