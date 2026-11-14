import {createClient} from 'npm:@supabase/supabase-js@2';
import {readWishAccess} from '../_shared/video-wishes-access.ts';
// Recheck deliberate sharing on every media request, including byte-range requests.
// Never return or redirect to a reusable Storage signed URL.
Deno.serve(async req=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'range','Access-Control-Expose-Headers':'Content-Range,Content-Length,Accept-Ranges','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers});
 try{
  const grant=await readWishAccess(new URL(req.url).searchParams.get('access')||'');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:items,error}=await db.rpc('get_shared_video_wishes',{_token:grant.token,_slideshow:grant.slideshow===true});
  const item=items?.find((i:any)=>i.id===grant.id);
  if(error||!item)throw new Error('Not authorised');
  const {data:sign,error:signError}=await db.storage.from('event-media').createSignedUrl(item.storage_path,30);
  if(signError||!sign)throw new Error('Not authorised');
  const range=req.headers.get('range');
  if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response(null,{status:416,headers});
  const upstream=await fetch(sign.signedUrl,{method:req.method,headers:range?{Range:range}:{}});
  const responseHeaders=new Headers(headers);
  for(const name of ['Content-Type','Content-Length','Content-Range','Accept-Ranges']){
   const value=upstream.headers.get(name);if(value)responseHeaders.set(name,value);
  }
  return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
 }catch{return new Response(null,{status:403,headers});}
});
