import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import {notifyTrialInterest} from './trialNotification.ts';
import {createClient} from 'npm:@supabase/supabase-js@2';
import {logo} from './logo.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Content-Type':'application/json'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const email=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
Deno.serve(async req=>{
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const form=req.headers.get('content-type')?.includes('multipart/form-data')?await req.formData():null;
 const b=form?Object.fromEntries(form):await req.json();
 if(b.action==='info'||b.action==='upload'){
  if(typeof b.token!=='string'||! /^[a-f0-9]{64}$/.test(b.token))return reply({error:'Invalid upload link.'},403);
  const {data:inv,error}=await db.from('venue_floor_plan_requests').select('*').eq('token_hash',await hash(b.token)).gt('expires_at',new Date().toISOString()).single();
  if(error||!inv)return reply({error:'This link has expired or is invalid. Please ask the couple for a new request.'},403);
  if(b.action==='info')return reply({venue_name:inv.venue_name,room_name:inv.room_name,venue_email:inv.venue_email});
  const fields=['venue_name','room_name','country','state_region','city','venue_contact_number','venue_email'];
  if(fields.some(k=>typeof b[k]!=='string'||!b[k].trim()||b[k].length>250)||!email(b.venue_email)||b.consent!=='true')return reply({error:'Complete the venue details and confirm permission to share.'},400);
  const f=b.file;if(!(f instanceof File)||f.size>25*1024*1024||f.size<8)return reply({error:'Choose a PNG or JPG floor plan up to 25 MB.'},400);
  const bytes=new Uint8Array(await f.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!png&&!jpg)return reply({error:'The floor plan must be a valid PNG or JPG image.'},400);
  const {count}=await db.from('venue_floor_plan_templates').select('id',{count:'exact',head:true}).eq('source_request_id',inv.id);if((count??0)>=20)return reply({error:'This request has reached its 20-room limit.'},400);
  if(b.trial_interest==='true'){const {error:interestError}=await db.from('venue_trial_interests').upsert({request_id:inv.id,venue_name:b.venue_name.trim(),venue_email:b.venue_email.trim(),venue_contact_number:b.venue_contact_number.trim()},{onConflict:'request_id'});if(interestError)throw new Error('Could not record trial interest.'); await notifyTrialInterest(Deno.env.get('RESEND_API_KEY'),inv.id,{'Venue name':b.venue_name.trim(),'Venue email':b.venue_email.trim(),'Phone':b.venue_contact_number.trim(),'Country':b.country.trim(),'State / Region':b.state_region.trim(),'Suburb / City':b.city.trim(),'Room':b.room_name.trim()});}
  const path=inv.requester_id+'/requests/'+inv.id+'/'+crypto.randomUUID()+(png?'.png':'.jpg');
  const {error:up}=await db.storage.from('venue-template-backgrounds').upload(path,bytes,{contentType:png?'image/png':'image/jpeg'});if(up)throw new Error('Could not upload the floor plan. Please retry.');
  const meta=Object.fromEntries(fields.map(k=>[k,b[k].trim()]));
  const {error:save}=await db.from('venue_floor_plan_templates').insert({...meta,submitted_by:inv.requester_id,source_request_id:inv.id,auto_shared:true,approved:false,background_image_path:path,background_width:20,background_height:35,room_width_m:20,room_length_m:35,background_opacity:1,fixtures:[],table_positions:[]});
  if(save){await db.storage.from('venue-template-backgrounds').remove([path]);return reply({error:save.code==='23505'?'A floor plan for this room has already been added. Use a different room name for another room.':'Could not save the template. Please retry.'},400);}
  return reply({ok:true});
 }
 const auth=req.headers.get('Authorization')??'';const {data:{user},error:authError}=await db.auth.getUser(auth.replace(/^Bearer /i,''));if(authError||!user)return reply({error:'Please sign in again.'},401);
 if(b.action==='ready')return reply({ready:!!Deno.env.get('RESEND_API_KEY')});
 if(b.action!=='request')return reply({error:'Invalid action'},400);
 const venue=String(b.venue_name??'').trim(),to=String(b.venue_email??'').trim().toLowerCase(),room=String(b.room_name??'').trim(),name=String(b.requester_name??'').trim(),message=String(b.message??'').trim();
 if(!venue||!room||!name||!email(to)||venue.length>200||name.length>200||room.length>200||message.length<30||message.length>6000)return reply({error:'Please complete the name, venue, room, email and message.'},400);
 const key=Deno.env.get('RESEND_API_KEY');if(!key)return reply({error:'The email service is not configured yet.'},503);
 const origin=String(b.origin??'');const local=/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);if(!local&&origin!=='https://weddingwaitress.com.au'&&origin!=='https://www.weddingwaitress.com.au')return reply({error:'Invalid website address.'},400);
 if(local&&to!==user.email?.toLowerCase())return reply({error:'While testing locally, send only to your own account email. Public venue links need the website update published first.'},400);
 const {count,error:countError}=await db.from('venue_floor_plan_requests').select('id',{head:true,count:'exact'}).eq('requester_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());if(countError)throw countError;if((count??0)>=10)return reply({error:'You can send up to 10 venue requests per day. Please try again tomorrow.'},429);
 const id=String(b.request_id??'');if(!/^[0-9a-f-]{36}$/.test(id))return reply({error:'Invalid request identifier.'},400);
 const {data:prior}=await db.from('venue_floor_plan_requests').select('status,requester_id').eq('id',id).maybeSingle();if(prior)return prior.requester_id===user.id?reply({ok:prior.status==='sent',error:prior.status==='sent'?undefined:'This request is already being processed. Check your inbox before sending another.'}):reply({error:'Invalid request'},403);
 const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');const link=origin+'/venue-floor-plan-upload#'+token;
 const {error:ins}=await db.from('venue_floor_plan_requests').insert({id,requester_id:user.id,requester_name:name,venue_name:venue,venue_email:to,room_name:room,token_hash:await hash(token)});if(ins)throw ins;
 const footer="Thank you for helping couples plan their celebrations. We'd love to welcome you to Wedding Waitress. Please visit our website and get in touch if you'd like to try Wedding Waitress for free.";
 const paragraphs=message.split(/\n\s*\n/).map(p=>'<p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:16px;line-height:26px;mso-line-height-rule:at-least">'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
 const html='<div style="font-family:Arial,sans-serif;color:#432619;max-width:620px;margin:auto;padding:28px;background:#fffdf8"><div style="font-size:15px;line-height:1.7;white-space:pre-wrap">'+paragraphs+'</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0"><tr><td align="center" bgcolor="#4eac55" style="border-radius:28px;background:#4eac55;background-image:linear-gradient(#79ca76,#449a4c);box-shadow:0 2px 4px #c6c6c6"><a href="'+esc(link)+'" style="display:inline-block;border:14px solid #4eac55;border-left-width:24px;border-right-width:24px;border-radius:28px;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:22px;text-decoration:none"><font color="#ffffff">Upload Your Venue Floor Plan</font></a></td></tr></table><p style="font-size:12px">You can add a separate plan for each room. This link is available for 30 days. Uploaded plans and venue details will be shared in the Wedding Waitress venue library.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px"><tr><td bgcolor="#432619" style="background:#432619;color:#ffffff;padding:26px;font-family:Arial,sans-serif;font-size:15px;line-height:25px"><strong style="color:#ffffff;font-size:18px">A thank you from Wedding Waitress</strong><p style="color:#ffffff;margin:16px 0">'+esc(footer)+'</p><p><a href="https://weddingwaitress.com.au" style="color:#ffffff;text-decoration:underline">weddingwaitress.com.au</a></p></td></tr><tr><td bgcolor="#fffdf8" style="padding:22px 26px;border-bottom:6px solid #432619"><img src="cid:ww-logo" alt="Wedding Waitress — Your Wedding & Event Assistant" width="280" style="display:block;max-width:100%;height:auto"></td></tr></table></div>';
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'venue-plan-'+id},body:JSON.stringify({from:'Wedding Waitress <support@weddingwaitress.com.au>',reply_to:user.email,to:[to],subject:'Request for our reception room’s floor plan — '+venue,html,text:message+'\n\nUpload your floor plan: '+link+'\n\n'+footer+' https://weddingwaitress.com.au',attachments:[{filename:'wedding-waitress.png',content:logo,content_id:'ww-logo'}]})});
 const result=await response.json();if(!response.ok){await db.from('venue_floor_plan_requests').update({status:'failed'}).eq('id',id);return reply({error:'The email service could not send this request. Please try again shortly.'},502);}
 await db.from('venue_floor_plan_requests').update({status:'sent',sent_at:new Date().toISOString(),provider_id:result.id}).eq('id',id);return reply({ok:true});
 }catch(e){console.error('venue request',e);return reply({error:'Could not complete this request. Please try again.'},500);}
});
