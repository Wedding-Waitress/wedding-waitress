import {createClient} from 'npm:@supabase/supabase-js@2';
import {cleanVideoWish,CLEANUP_AGE_MS} from '../_shared/video-wishes-cleanup.ts';
// Internal authenticated scheduler: only Video Wishes jobs older than two hours.
Deno.serve(async req=>{
 const secret=Deno.env.get('VIDEO_WISHES_CLEANUP_SECRET');
 if(req.method!=='POST'||!secret||req.headers.get('x-video-wishes-cleanup-secret')!==secret)return new Response(null,{status:403});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:jobs,error}=await db.from('video_wishes_uploads').select('item_id,event_id,processor_id,created_at').is('cleanup_completed_at',null).lt('created_at',new Date(Date.now()-CLEANUP_AGE_MS).toISOString()).order('created_at').limit(100);
 if(error)return new Response(null,{status:500});
 const deps={
  async readItem(id:string){const {data,error}=await db.from('event_media_items').select('id,event_id,storage_path,upload_status,source_category').eq('id',id).maybeSingle();if(error)throw error;return data;},
  async claimIncomplete(id:string){const {data,error}=await db.from('event_media_items').update({upload_status:'failed'}).eq('id',id).eq('source_category','video_wishes').in('upload_status',['pending','failed']).select('id');if(error)throw error;return !!data?.length;},
  async deleteProcessor(id:string){const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${Deno.env.get('CLOUDFLARE_ACCOUNT_ID')}/stream/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN')}`}});if(!response.ok&&response.status!==404)throw new Error('PROCESSOR_DELETE_FAILED');},
  async deleteFile(path:string){const {error}=await db.storage.from('event-media').remove([path]);if(error)throw error;},
  async completeJob(id:string){const {error}=await db.from('video_wishes_uploads').update({processor_id:null,cleanup_completed_at:new Date().toISOString()}).eq('item_id',id);if(error)throw error;}
 };
 let cleaned=0,failed=0;
 for(const job of jobs||[]){try{if(await cleanVideoWish(job,deps))cleaned++;}catch{failed++;}}
 return Response.json({cleaned,failed},{status:failed?500:200});
});
