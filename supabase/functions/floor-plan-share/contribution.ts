
import {notifyTrialInterest} from './trialNotification.ts';
export async function contribute(db:any,link:any,b:any){
 const fields=['venue_name','venue_email','venue_contact_number'];
 if(b.action==='upload')fields.push('room_name','country','state_region','city');
 if(fields.some(k=>typeof b[k]!=='string'||!b[k].trim()||b[k].length>250)||!/^\S+@\S+\.\S+$/.test(b.venue_email))throw Error('Please complete the venue contact details.');
 if(b.action==='upload'&&b.consent!=='true')throw Error('Confirm permission to share this floor plan.');
 if(b.action==='trial'||b.trial_interest==='true'){
  if(b.action==='trial'&&b.consent!==true)throw Error('Please confirm you would like us to contact you.');
  const {data:prior,error:readError}=await db.from('reception_collaborator_contacts').select('notified_at').eq('link_id',link.id).maybeSingle();if(readError)throw readError;
  if(!prior?.notified_at){
   const {error}=await db.from('reception_collaborator_contacts').upsert({link_id:link.id,venue_name:b.venue_name.trim(),venue_email:b.venue_email.trim(),venue_phone:b.venue_contact_number.trim()});if(error)throw error;
   await notifyTrialInterest(Deno.env.get('RESEND_API_KEY'),link.id,{'Venue name':b.venue_name.trim(),'Venue email':b.venue_email.trim(),'Phone':b.venue_contact_number.trim()});
   const {error:markError}=await db.from('reception_collaborator_contacts').update({notified_at:new Date().toISOString()}).eq('link_id',link.id);if(markError)throw markError;
  }
 }
 if(b.action==='trial')return {ok:true};
 if(b.consent!=='true')throw Error('Confirm permission to share this floor plan.');
 const f=b.file;if(!(f instanceof File)||f.size>25*1024*1024||f.size<8)throw Error('Choose a PNG or JPG up to 25 MB.');
 const bytes=new Uint8Array(await f.arrayBuffer()),png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!png&&!jpg)throw Error('Choose a valid PNG or JPG image.');
 const {count,error:countError}=await db.from('venue_floor_plan_templates').select('id',{count:'exact',head:true}).eq('source_collaborator_link_id',link.id);if(countError)throw countError;if((count??0)>=20)throw Error('This link has reached its 20-room upload limit.');
 const path=link.user_id+'/collaborators/'+link.id+'/'+crypto.randomUUID()+(png?'.png':'.jpg');
 const {error:uploadError}=await db.storage.from('venue-template-backgrounds').upload(path,bytes,{contentType:png?'image/png':'image/jpeg'});if(uploadError)throw uploadError;
 const {error}=await db.from('venue_floor_plan_templates').insert({...Object.fromEntries(fields.map(k=>[k,b[k].trim()])),submitted_by:link.user_id,source_collaborator_link_id:link.id,auto_shared:true,approved:false,background_image_path:path,background_width:20,background_height:35,room_width_m:20,room_length_m:35,background_opacity:1,fixtures:[],table_positions:[]});
 if(error){await db.storage.from('venue-template-backgrounds').remove([path]);throw Error(error.code==='23505'?'This room has already been added. Use a different room name for another room.':'Could not save the floor plan. Please retry.');}
 return {ok:true};
}
