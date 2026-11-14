import {createWishAccess} from '../_shared/video-wishes-access.ts';
import {isGeneralGalleryItem} from '../_shared/gallery-public-media.ts';
import {guestbookMemoryPoster} from '../_shared/guestbook-memory-poster.ts';
import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
// Public edge function for the gallery Live View.
// Returns approved+uploaded items for a valid, open gallery token,
// each with a short-lived signed URL from the private event-media bucket.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

Deno.serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // If the gallery is password-protected, require a correct password.
    const { data: pwOk, error: pwErr } = await supabase.rpc('verify_event_media_password', {
      _token: token,
      _password: password,
    });
    if (pwErr) {
      return new Response(JSON.stringify({ error: pwErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pwOk !== true) {
      return new Response(JSON.stringify({ error: 'password required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY DEFINER RPC enforces: valid token, not expired, gallery is_open=true,
    // upload_status='uploaded', moderation_status='approved'. Hidden items never returned.
    const { data: rows, error } = await supabase.rpc('get_event_media_items_public', { _token: token });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = (rows || []).filter(isGeneralGalleryItem) as Array<{
      id: string;
      kind: 'photo' | 'video' | 'audio';
      mime_type: string;
      storage_path: string;
      duration_sec: number | null;
      uploader_name: string | null;
      caption: string | null;
      uploaded_at: string | null;
    }>;

    let signed: Array<typeof items[number] & { signed_url: string }> = [];
    if (items.length > 0) {
      const paths = items.map((r) => r.storage_path);
      const { data: signs, error: signErr } = await supabase
        .storage
        .from('event-media')
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (signErr) {
        return new Response(JSON.stringify({ error: signErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const map = new Map<string, string>();
      (signs || []).forEach((s: { path?: string | null; signedUrl?: string | null }) => {
        if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
      });
      signed = items
        .map((r) => ({ ...r, signed_url: map.get(r.storage_path) || '' }))
        .filter((r) => r.signed_url.length > 0);
    }

    // Video Wishes are private by default and independently approved for each surface.
    const slideshow=body.purpose==='slideshow';
    const {data:wishes,error:wishesError}=await supabase.rpc('get_shared_video_wishes',{_token:token,_slideshow:slideshow});
    if(wishesError)throw wishesError;
    for(const wish of wishes||[]){
      const access=await createWishAccess(wish.id,token,slideshow);
      signed.push({id:wish.id,kind:'video',mime_type:wish.mime_type,storage_path:'',duration_sec:wish.duration_sec,uploader_name:wish.uploader_name,caption:wish.caption,uploaded_at:wish.uploaded_at,
        album:wish.album,source_category:'video_wishes',shared_to_slideshow:wish.shared_to_slideshow,
        signed_url:Deno.env.get('SUPABASE_URL')+'/functions/v1/video-wishes-media?access='+encodeURIComponent(access)} as any);
    }

    const {data:messages,error:textError}=await supabase.rpc('get_guestbook_gallery_text',{_token:token});
    if(textError)throw textError;
    for(const row of messages||[]){signed.push({id:row.id,kind:'photo',mime_type:'image/svg+xml',storage_path:'',duration_sec:null,uploader_name:row.uploader_name,caption:row.message,uploaded_at:row.created_at,album:null,source_category:'guestbook_text',signed_url:guestbookMemoryPoster(row.message,row.uploader_name)} as any);}
    signed.sort((a,b)=>Date.parse(a.uploaded_at||'')-Date.parse(b.uploaded_at||''));
    return new Response(
      JSON.stringify({ items: signed, guestbook_messages: messages || [], ttl: SIGNED_URL_TTL_SECONDS }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
