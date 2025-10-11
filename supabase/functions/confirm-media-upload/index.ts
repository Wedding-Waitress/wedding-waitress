import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      gallery_id,
      upload_token,
      file_path,
      type,
      post_type,
      caption,
      width,
      height,
      duration_seconds,
      file_size,
      mime_type,
      cloudflare_stream_uid,
      text_content,
      theme_id
    } = await req.json();

    console.log('Confirm media upload:', { 
      gallery_id, 
      file_path, 
      type, 
      post_type,
      file_size,
      mime_type
    });

    // Validate gallery exists and get settings
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('id, require_approval, owner_id, is_active, show_public_gallery')
      .eq('id', gallery_id)
      .single();

    if (galleryError || !gallery) {
      console.error('Gallery not found:', galleryError);
      return new Response(
        JSON.stringify({ error: 'Gallery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file path is within expected gallery prefix
    const expectedPrefix = `galleries/${gallery_id}/`;
    if (file_path && !file_path.startsWith(expectedPrefix)) {
      console.error('Invalid file path:', file_path);
      return new Response(
        JSON.stringify({ error: 'Invalid file path' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert media record
    const { data: media, error: mediaError } = await supabase
      .from('media_uploads')
      .insert({
        gallery_id,
        uploader_token: upload_token,
        type,
        post_type: post_type || type,
        caption: caption || null,
        file_url: file_path || '',
        thumbnail_url: null,
        cloudflare_stream_uid: cloudflare_stream_uid || null,
        status: gallery.require_approval ? 'pending' : 'approved',
        file_size_bytes: file_size || null,
        mime_type: mime_type || null,
        width: width || null,
        height: height || null,
        duration_seconds: duration_seconds || null,
        text_content: text_content || null,
        theme_id: theme_id || null,
        approved_at: gallery.require_approval ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Media insert error:', mediaError);
      throw mediaError;
    }

    console.log('Media record created:', media.id);

    return new Response(
      JSON.stringify({
        id: media.id,
        status: media.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in confirm-media-upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});