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

    // Validate file path is within expected gallery prefix (only for non-video uploads)
    const expectedPrefix = `galleries/${gallery_id}/`;
    if (file_path && !file_path.startsWith(expectedPrefix) && post_type !== 'video') {
      console.error('Invalid file path:', file_path);
      return new Response(
        JSON.stringify({ error: 'Invalid file path' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map post_type to correct type value for database constraint
    // type can only be 'image' or 'video' (NOT 'photo' or 'text')
    let mediaType: string;
    if (post_type === 'photo') {
      mediaType = 'image';
    } else if (post_type === 'video') {
      mediaType = 'video';
    } else if (post_type === 'text') {
      // Text posts don't have files, so we use 'image' as a placeholder
      // The post_type field will correctly identify it as 'text'
      mediaType = 'image';
    } else {
      // Fallback to the type passed in (should be 'image' or 'video')
      mediaType = type === 'photo' ? 'image' : type;
    }

    // Insert media record with appropriate fields based on media type
    const insertData: any = {
      gallery_id,
      uploader_token: upload_token,
      type: mediaType,
      post_type: post_type || type,
      caption: caption || null,
      status: gallery.require_approval ? 'pending' : 'approved',
      file_size_bytes: file_size || null,
      mime_type: mime_type || null,
      text_content: text_content || null,
      theme_id: theme_id || null,
      approved_at: gallery.require_approval ? null : new Date().toISOString(),
    };

    // For videos uploaded to Cloudflare Stream
    if (post_type === 'video' && cloudflare_stream_uid) {
      insertData.cloudflare_stream_uid = cloudflare_stream_uid;
      insertData.stream_status = 'queued';
      insertData.stream_ready = false;
      insertData.file_url = ''; // No file URL for Stream videos
      insertData.thumbnail_url = null;
      // Store high-quality poster URL
      insertData.poster_url = `https://customer-xvug97yzqxwnmtgg.cloudflarestream.com/${cloudflare_stream_uid}/thumbnails/thumbnail.jpg?width=1280&height=1280&fit=crop`;
    }
    // For photos uploaded to Supabase Storage
    else if (post_type === 'photo' || post_type === 'image') {
      insertData.file_url = file_path || '';
      insertData.thumbnail_url = null;
      insertData.cloudflare_stream_uid = null;
      insertData.width = width || null;
      insertData.height = height || null;
      // Store paths for responsive images (Supabase will transform on-the-fly)
      insertData.thumb_512_url = file_path;
      insertData.thumb_1280_url = file_path;
    }
    // For text posts
    else if (post_type === 'text') {
      insertData.file_url = '';
      insertData.thumbnail_url = null;
      insertData.cloudflare_stream_uid = null;
    }

    const { data: media, error: mediaError } = await supabase
      .from('media_uploads')
      .insert(insertData)
      .select()
      .single();

    if (mediaError) {
      console.error('Media insert error:', mediaError);
      // Return detailed error message to client
      const errorMsg = mediaError.message || 'Failed to save media record';
      const errorCode = (mediaError as any).code;
      const errorDetails = (mediaError as any).details || '';
      
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          code: errorCode,
          details: errorDetails,
          troubleshooting: 'Check that the gallery is active and accepting uploads'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
    
    // Return detailed error to help with debugging
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Upload confirmation failed',
        details: error.toString(),
        troubleshooting: error.message?.includes('RLS') 
          ? 'This gallery may not be accepting public uploads. Ask the host to check gallery settings.'
          : error.message?.includes('CORS')
          ? 'Storage CORS configuration may be incorrect. Contact support.'
          : 'Please try again or contact support if the problem persists.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});