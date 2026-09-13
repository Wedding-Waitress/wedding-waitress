import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {describe,expect,it,vi} from 'vitest';
const target='11111111-1111-4111-8111-111111111111',event='22222222-2222-4222-8222-222222222222',actor='33333333-3333-4333-8333-333333333333';
const path=`${target}/${event}/background.png`;
const source=readFileSync('supabase/functions/admin-customer-preview-media/index.ts','utf8').replace(/^import .*$/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
async function fixture(options:{owner?:boolean;identity?:boolean;event?:boolean;path?:string;printPath?:string;auditFailure?:boolean;artwork?:boolean;gallery?:boolean;media?:boolean;qrDesign?:boolean;profile?:boolean;liveConfig?:Record<string,unknown>;liveSettings?:boolean}={}){
 const getUser=vi.fn(async()=>({data:{user:options.identity===false?null:{id:actor,email:'owner@example.test',is_anonymous:false}},error:null}));
 const rpc=vi.fn(async()=>({data:options.owner!==false,error:null}));
 const eq=vi.fn();
 const insert=vi.fn(async()=>({error:options.auditFailure?new Error('private audit failure'):null}));
 const from=vi.fn((table:string)=>{
  if(table==='events'&&options.path){const query={select:vi.fn(()=>query),eq:vi.fn((...args:unknown[])=>{eq(table,...args);return query;}),maybeSingle:vi.fn(async()=>({data:options.event===false?null:{id:event,user_id:target,event_image_path:options.path},error:null})),insert};return query;}
  if(table==='live_view_module_settings'&&options.liveConfig){const query={select:vi.fn(()=>query),eq:vi.fn((...args:unknown[])=>{eq(table,...args);return query;}),maybeSingle:vi.fn(async()=>({data:options.liveSettings===false?null:options.liveConfig,error:null})),insert};return query;}
  const query={select:vi.fn(()=>query),eq:vi.fn((...args:unknown[])=>{eq(table,...args);return query;}),maybeSingle:vi.fn(async()=>({data:table==='events'?(options.event===false?null:{id:event,user_id:target}):table==='event_media_galleries'?(options.gallery===false?null:{id:'fixture-gallery',photo_booth_strip_logo_url:options.path??path,photo_booth_strip_template_url:options.path??path,cover_image_url:options.path??path,logo_image_url:options.path??path,background_image_url:options.path??path}):table==='event_media_items'?(options.media===false?null:{storage_path:options.path??path}):table==='profiles'&&options.profile===false?null:table==='qr_code_settings'&&options.qrDesign===false?null:['invitation_card_settings','signage_settings'].includes(table)&&options.artwork===false?null:{background_image_url:options.path??path,background_image_print_url:options.printPath??null,center_image_url:options.path??path,profile_image_path:options.path??path},error:null})),insert};
  return query;
 });
 const createSignedUrl=vi.fn(async()=>({data:{signedUrl:'https://isolated.test/storage/v1/object/sign/reception-floor-plan-backgrounds/file?token=fixture'},error:null}));
 const storageFrom=vi.fn(()=>({createSignedUrl}));
 const client=vi.fn((_url:string,key:string)=>key==='fixture-service'?{from,storage:{from:storageFrom}}:{auth:{getUser},rpc});
 let handler:(req:Request)=>Promise<Response>=async()=>new Response(null,{status:500});
 const env:Record<string,string>={SUPABASE_URL:'https://isolated.test',SUPABASE_ANON_KEY:'fixture-publishable',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'};
 new Function('createClient','isOwnerAdminEmail','Deno','crypto',compiled)(client,(email:string)=>email==='owner@example.test',{env:{get:(name:string)=>env[name]},serve:(fn:typeof handler)=>{handler=fn;}},webcrypto);
 const grant=btoa(JSON.stringify({user_id:actor,exp:Date.now()+60000}));
 const signature=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|fixture-service`))).toString('hex');
 const body={customer_id:target,event_id:event,kind:'reception_background',admin_grant:grant,admin_grant_signature:signature};
 const request=(patch:Record<string,unknown>={})=>new Request('https://isolated.test',{method:'POST',headers:{Authorization:'Bearer fixture-user-token','Content-Type':'application/json'},body:JSON.stringify({...body,...patch})});
 return {handler,request,body,from,eq,insert,storageFrom,createSignedUrl};
}
describe('owner-only read-only customer media',()=>{
 it.each([`${target}/events/${event}/${actor}.png`,`${target}/drafts/${actor}/${actor}.webp`])('signs only an exact owned event reference %s',async path=>{const a=await fixture({path});expect((await a.handler(a.request({kind:'event_image',record_id:event}))).status).toBe(200);expect(a.eq).toHaveBeenCalledWith('events','id',event);expect(a.eq).toHaveBeenCalledWith('events','user_id',target);expect(a.storageFrom).toHaveBeenCalledWith('event-branding');expect(a.createSignedUrl).toHaveBeenCalledWith(path,600);});
 it.each([`${actor}/events/${event}/${actor}.png`,`${target}/events/${actor}/${actor}.png`,`${target}/events/${event}/${actor}.svg`,`${target}/drafts/${actor}/${actor}.png?token=forbidden`])('refuses foreign or unsafe event artwork %s',async path=>{const a=await fixture({path});expect((await a.handler(a.request({kind:'event_image',record_id:event}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();});
 it('rejects caller-selected other event artwork records',async()=>{const a=await fixture({path:`${target}/events/${event}/${actor}.png`});expect((await a.handler(a.request({kind:'event_image',record_id:actor}))).status).toBe(400);expect(a.createSignedUrl).not.toHaveBeenCalled();});
 it.each([['invitation','rsvp_invite_config','rsvp_invite','invitations','png'],['welcome','welcome_video_config','welcome_video','live-view-uploads','mp4'],['reception','reception_floor_plan_config','reception_floor_plan','live-view-uploads','jpg'],['menu','menu_config','menu','live-view-uploads','pdf'],['hero','hero_image_config','hero_image','live-view-uploads','webp']])('signs only the exact recorded guest app %s upload',async(purpose,field,folder,bucket,ext)=>{const asset=`${target}/${event}/${folder}/123.${ext}`,a=await fixture({liveConfig:{[field]:{[purpose==='welcome'?'video_url':'file_url']:`https://isolated.test/storage/v1/object/public/${bucket}/${asset}`}}});expect((await a.handler(a.request({kind:`live_view_${purpose}`,record_id:actor}))).status).toBe(200);expect(a.eq).toHaveBeenCalledWith('events','user_id',target);expect(a.eq).toHaveBeenCalledWith('live_view_module_settings','event_id',event);expect(a.eq).toHaveBeenCalledWith('live_view_module_settings','id',actor);expect(a.storageFrom).toHaveBeenCalledWith(bucket);expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);});
 it.each([`${actor}/${event}/menu/123.png`,`${target}/${actor}/menu/123.png`,`${target}/${event}/hero_image/123.png`,`${target}/${event}/menu/123.exe`,`${target}/${event}/menu/123.png?token=forbidden`])('refuses foreign or wrong-purpose saved menu %s',async asset=>{const a=await fixture({liveConfig:{menu_config:{file_url:`https://isolated.test/storage/v1/object/public/live-view-uploads/${asset}`}}});expect((await a.handler(a.request({kind:'live_view_menu',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();});
 it('refuses missing guest app settings and event ownership',async()=>{const config={menu_config:{file_url:`https://isolated.test/storage/v1/object/public/live-view-uploads/${target}/${event}/menu/123.png`}};for(const options of [{liveConfig:config,liveSettings:false},{liveConfig:config,event:false}]){const a=await fixture(options);expect((await a.handler(a.request({kind:'live_view_menu',record_id:actor}))).status).toBe(404);expect(a.createSignedUrl).not.toHaveBeenCalled();}});
 it.each(['invitation','welcome','reception','menu','hero'])('does not sign a missing or unverified guest app %s asset',async purpose=>{const a=await fixture();expect((await a.handler(a.request({kind:`live_view_${purpose}`,record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();expect(a.eq).toHaveBeenCalledWith('live_view_module_settings','event_id',event);expect(a.eq).toHaveBeenCalledWith('live_view_module_settings','id',actor);});
 it.each(['cover','logo','background'])('signs only the exact actual owner/event gallery %s upload',async purpose=>{const asset=`${target}/${event}/${purpose}-123.webp`,a=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${asset}`});expect((await a.handler(a.request({kind:`gallery_${purpose}`,record_id:actor}))).status).toBe(200);expect(a.eq).toHaveBeenCalledWith('event_media_galleries','id',actor);expect(a.eq).toHaveBeenCalledWith('event_media_galleries','event_id',event);expect(a.eq).toHaveBeenCalledWith('event_media_galleries','user_id',target);expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);});
 it.each([`${actor}/${event}/cover-123.png`,`${target}/${actor}/cover-123.png`,`${target}/${event}/logo-123.png`,`${target}/${event}/photobooth-strip-logo-123.jpg`])('rejects foreign/wrong-purpose gallery cover %s',async asset=>{const a=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${asset}`});expect((await a.handler(a.request({kind:'gallery_cover',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();});
 it('refuses missing galleries and token-bearing gallery branding references',async()=>{const a=await fixture({gallery:false});expect((await a.handler(a.request({kind:'gallery_cover',record_id:actor}))).status).toBe(404);const b=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${target}/${event}/cover-123.png?token=unverified`});expect((await b.handler(b.request({kind:'gallery_cover',record_id:actor}))).status).toBe(409);expect(b.createSignedUrl).not.toHaveBeenCalled();});
 it('signs only the actual owned Place Card background upload',async()=>{
  const asset=`${target}/place-cards/place-card-bg-123.png`,a=await fixture({path:`https://isolated.test/storage/v1/object/public/qr-assets/${asset}`});
  expect((await a.handler(a.request({kind:'place_card_background',record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('place_card_settings','id',actor);expect(a.eq).toHaveBeenCalledWith('place_card_settings','event_id',event);expect(a.eq).toHaveBeenCalledWith('place_card_settings','user_id',target);
  expect(a.storageFrom).toHaveBeenCalledWith('qr-assets');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each([`${actor}/place-cards/place-card-bg-123.png`,`${target}/qr-logo/place-card-bg-123.png`,`${target}/place-cards/other-image.png`])('rejects foreign/wrong-purpose Place Card background %s',async asset=>{
  const a=await fixture({path:`https://isolated.test/storage/v1/object/public/qr-assets/${asset}`});expect((await a.handler(a.request({kind:'place_card_background',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('requires a matching catalogue row before signing a saved Place Card gallery image',async()=>{
  const asset='approved/actual.png',url=`https://isolated.test/storage/v1/object/public/place-card-gallery/${asset}`,a=await fixture({path:url});
  expect((await a.handler(a.request({kind:'place_card_background',record_id:actor}))).status).toBe(200);expect(a.eq).toHaveBeenCalledWith('place_card_gallery_images','image_url',url);expect(a.storageFrom).toHaveBeenCalledWith('place-card-gallery');
 });
 it('does not sign token-bearing Place Card artwork references',async()=>{
  const a=await fixture({path:`https://isolated.test/storage/v1/object/public/qr-assets/${target}/place-cards/place-card-bg-123.png?token=unsafe`});expect((await a.handler(a.request({kind:'place_card_background',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it.each(['logo','template'])('signs only the exact saved owner/event Photo Booth strip %s',async purpose=>{
  const asset=`${target}/${event}/photobooth-strip-${purpose}-123.jpeg`;
  const a=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${asset}`});
  expect((await a.handler(a.request({kind:`booth_strip_${purpose}`,record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('event_media_galleries','id',actor);expect(a.eq).toHaveBeenCalledWith('event_media_galleries','event_id',event);expect(a.eq).toHaveBeenCalledWith('event_media_galleries','user_id',target);
  expect(a.storageFrom).toHaveBeenCalledWith('event-media-branding');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each([`${actor}/${event}/photobooth-strip-logo-123.jpg`,`${target}/${actor}/photobooth-strip-logo-123.jpg`,`${target}/${event}/photobooth-strip-template-123.jpg`,`${target}/${event}/other-logo-123.jpg`])('refuses foreign or wrong-purpose Photo Booth logo %s',async asset=>{
  const a=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${asset}`});expect((await a.handler(a.request({kind:'booth_strip_logo',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('does not sign a missing gallery or an existing token-bearing artwork URL',async()=>{
  const a=await fixture({gallery:false});expect((await a.handler(a.request({kind:'booth_strip_logo',record_id:actor}))).status).toBe(404);
  const b=await fixture({path:`https://isolated.test/storage/v1/object/public/event-media-branding/${target}/${event}/photobooth-strip-logo-123.jpg?token=unsafe`});expect((await b.handler(b.request({kind:'booth_strip_logo',record_id:actor}))).status).toBe(409);expect(b.createSignedUrl).not.toHaveBeenCalled();
 });
 it('signs the saved private profile image even for an account with no events',async()=>{
  const asset=`${target}/profile-image`,a=await fixture({path:asset,event:false});
  expect((await a.handler(a.request({kind:'profile_image',record_id:target,event_id:''}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('profiles','id',target);expect(a.from).not.toHaveBeenCalledWith('events');
  expect(a.storageFrom).toHaveBeenCalledWith('profile-images');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
  expect(a.insert).toHaveBeenCalledWith(expect.objectContaining({new_state:{kind:'profile_image',event_id:null,read_only:true}}));
 });
 it.each([`${actor}/profile-image`,`${target}/another-image`,`${target}/../profile-image`])('refuses foreign or non-profile account artwork %s',async path=>{
  const a=await fixture({path});expect((await a.handler(a.request({kind:'profile_image',record_id:target,event_id:''}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('rejects missing customer profiles and caller-selected foreign profile records',async()=>{
  const a=await fixture({profile:false});expect((await a.handler(a.request({kind:'profile_image',record_id:target,event_id:''}))).status).toBe(404);
  const b=await fixture({path:`${target}/profile-image`});expect((await b.handler(b.request({kind:'profile_image',record_id:actor,event_id:''}))).status).toBe(400);
  expect(a.createSignedUrl).not.toHaveBeenCalled();expect(b.createSignedUrl).not.toHaveBeenCalled();
 });
 it('signs only the actual owner/event QR-logo path derived from the saved design',async()=>{
  const asset=`${target}/${event}/qr-logo/123.png`;const a=await fixture({path:`https://isolated.test/storage/v1/object/public/qr-assets/${asset}`});
  expect((await a.handler(a.request({kind:'qr_logo',record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('qr_code_settings','id',actor);expect(a.eq).toHaveBeenCalledWith('qr_code_settings','event_id',event);
  expect(a.eq).toHaveBeenCalledWith('qr_code_settings','user_id',target);expect(a.storageFrom).toHaveBeenCalledWith('qr-assets');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each([`https://isolated.test/storage/v1/object/public/qr-assets/${actor}/${event}/qr-logo/file.png`,
  `https://isolated.test/storage/v1/object/public/qr-assets/${target}/${actor}/qr-logo/file.png`,
  `https://isolated.test/storage/v1/object/public/qr-assets/${target}/${event}/rsvp_invite/file.png`,
  `https://isolated.test/storage/v1/object/public/qr-assets/${target}/${event}/qr-logo/file.png?token=unsafe`])('refuses foreign or wrong-purpose QR artwork %s',async path=>{
  const a=await fixture({path});expect((await a.handler(a.request({kind:'qr_logo',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('does not sign a missing QR design',async()=>{
  const a=await fixture({qrDesign:false});expect((await a.handler(a.request({kind:'qr_logo',record_id:actor}))).status).toBe(404);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('signs the exact owned Signage print master, not a different preview background',async()=>{
  const asset=`${target}/signage/signage-bg-123.png`;
  const a=await fixture({path:'https://untrusted.test/preview.png',printPath:`https://isolated.test/storage/v1/object/public/invitations/${asset}`});
  expect((await a.handler(a.request({kind:'signage_background',record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('signage_settings','id',actor);expect(a.eq).toHaveBeenCalledWith('signage_settings','event_id',event);
  expect(a.eq).toHaveBeenCalledWith('signage_settings','user_id',target);expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each([`https://isolated.test/storage/v1/object/public/invitations/${actor}/signage/file.png`,
  `https://isolated.test/storage/v1/object/public/invitations/${target}/invitations/file.png`,
  `https://isolated.test/storage/v1/object/public/invitations/${target}/signage/file.png?token=unsafe`])('refuses foreign or wrong-folder Signage artwork %s',async path=>{
  const a=await fixture({path});expect((await a.handler(a.request({kind:'signage_background',record_id:actor}))).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('does not sign a missing Signage record',async()=>{
  const a=await fixture({artwork:false});expect((await a.handler(a.request({kind:'signage_background',record_id:actor}))).status).toBe(404);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('signs uploaded media only after the actual gallery, item and event ownership chain is verified',async()=>{
  const asset=`${event}/${actor}.jpg`,a=await fixture({path:asset});
  expect((await a.handler(a.request({kind:'event_media',record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('event_media_galleries','user_id',target);
  expect(a.eq).toHaveBeenCalledWith('event_media_items','event_id',event);
  expect(a.eq).toHaveBeenCalledWith('event_media_items','id',actor);
  expect(a.eq).toHaveBeenCalledWith('event_media_items','gallery_id','fixture-gallery');
  expect(a.eq).toHaveBeenCalledWith('event_media_items','upload_status','uploaded');
  expect(a.storageFrom).toHaveBeenCalledWith('event-media');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each([{gallery:false},{media:false},{path:`${target}/${actor}.jpg`},{path:`${event}/another-item.jpg`},{path:`${event}/${actor}.jpg/../private`}])('does not sign missing or foreign media (%j)',async options=>{
  const a=await fixture(options);expect((await a.handler(a.request({kind:'event_media',record_id:actor}))).status).toBe(options.gallery===false||options.media===false?404:409);
  expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('signs only the background derived from the exact customer-owned invitation artwork',async()=>{
  const asset=`${target}/invitations/invitations-bg-123.png`;
  const a=await fixture({path:`https://isolated.test/storage/v1/object/public/invitations/${asset}`});
  expect((await a.handler(a.request({kind:'invitation_background',record_id:actor}))).status).toBe(200);
  expect(a.eq).toHaveBeenCalledWith('invitation_card_settings','id',actor);
  expect(a.eq).toHaveBeenCalledWith('invitation_card_settings','event_id',event);
  expect(a.eq).toHaveBeenCalledWith('invitation_card_settings','user_id',target);
  expect(a.storageFrom).toHaveBeenCalledWith('invitations');expect(a.createSignedUrl).toHaveBeenCalledWith(asset,600);
 });
 it.each(['https://tracking.example/file.png',`https://isolated.test/storage/v1/object/public/invitations/other/invitations/file.png`,
  `https://isolated.test/storage/v1/object/public/invitations/${target}/invitations/file.png?token=unverified`,
  `https://isolated.test/storage/v1/object/public/invitations/${target}/invitations/%2fprivate.png`])('refuses unsafe invitation artwork %s',async path=>{
  const a=await fixture({path});expect((await a.handler(a.request({kind:'invitation_background',record_id:actor}))).status).toBe(409);
  expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('does not sign a missing or foreign artwork record',async()=>{
  const a=await fixture({artwork:false});expect((await a.handler(a.request({kind:'invitation_background',record_id:actor}))).status).toBe(404);
  expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('derives the exact saved path, scopes the event and audits before returning a short-lived URL',async()=>{
  const a=await fixture();const response=await a.handler(a.request());
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({read_only:true});
  expect(a.eq).toHaveBeenCalledWith('events','user_id',target);expect(a.eq).toHaveBeenCalledWith('reception_floor_plans','user_id',target);
  expect(a.storageFrom).toHaveBeenCalledWith('reception-floor-plan-backgrounds');expect(a.createSignedUrl).toHaveBeenCalledWith(path,600);
  expect(a.insert).toHaveBeenCalledWith(expect.objectContaining({administrator_id:actor,target_id:target,action:'view_customer_media'}));
  expect(response.headers.get('Cache-Control')).toBe('no-store');
 });
 it.each([{owner:false},{identity:false},{event:false}])('does not sign media without verified owner identity and customer event scope (%j)',async(options)=>{
  const a=await fixture(options);expect((await a.handler(a.request())).status).toBe(options.event===false?404:403);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it.each([{path:'another-customer/file.png'},{path:`${target}/${event}/../file.png`},{path:`${target}/${event}/%2e%2e/file.png`}])('rejects foreign and unsafe saved paths (%j)',async(options)=>{
  const a=await fixture(options);expect((await a.handler(a.request())).status).toBe(409);expect(a.createSignedUrl).not.toHaveBeenCalled();
 });
 it('rejects caller-selected paths, buckets and mutation actions',async()=>{
  const a=await fixture();for(const patch of [{path},{bucket:'another-bucket'},{action:'delete'}])expect((await a.handler(a.request(patch))).status).toBe(400);
  expect(a.createSignedUrl).not.toHaveBeenCalled();expect(a.insert).not.toHaveBeenCalled();
 });
 it('rejects invalid verification and never returns a URL when audit persistence fails',async()=>{
  const a=await fixture();expect((await a.handler(a.request({admin_grant_signature:'invalid'}))).status).toBe(403);expect(a.createSignedUrl).not.toHaveBeenCalled();
  const b=await fixture({auditFailure:true});const response=await b.handler(b.request());expect(response.status).toBe(503);expect(await response.text()).not.toMatch(/token=|private audit/);
 });
});
