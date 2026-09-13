import { createClient } from 'npm:@supabase/supabase-js@2'
import { Webhook } from 'npm:svix@2.5.0'
const json = (body: Record<string, unknown>, status=200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json' } })
Deno.serve(async req => {
  if(req.method !== 'POST') return json({error:'Method not allowed'},405)
  const secret=Deno.env.get('RESEND_WEBHOOK_SECRET'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!secret || !url || !key) return json({error:'Webhook configuration missing'},503)
  const eventId=req.headers.get('svix-id') || ''
  let event: {type:string;created_at:string;data:{email_id:string}}
  try {
    // Verify the raw body, signature AND timestamp before parsing or recording.
    const rawBody=await req.text()
    new Webhook(secret).verify(rawBody, {'svix-id':eventId,'svix-timestamp':req.headers.get('svix-timestamp') || '',
      'svix-signature':req.headers.get('svix-signature') || ''})
    event=JSON.parse(rawBody) as typeof event
  } catch {return json({error:'Invalid webhook signature'},401)}
  if(!['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed'].includes(event.type)) return json({success:true,ignored:true})
  if(!event.data?.email_id || !Number.isFinite(Date.parse(event.created_at))) return json({error:'Invalid delivery event'},400)
  // No recipient bodies, subjects, HTML, OTPs, tokens, raw metadata or secrets.
  const admin=createClient(url,key,{auth:{persistSession:false}})
  const {data,error}=await admin.rpc('record_email_delivery_event',{p_provider_event_id:eventId,p_message_id:event.data.email_id,
    p_type:event.type,p_occurred_at:event.created_at})
  if(error || data!==true) return json({error:'Unable to record delivery event'},503)
  return json({success:true})
})
