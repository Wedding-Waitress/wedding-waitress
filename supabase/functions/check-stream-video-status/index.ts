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

    const { media_upload_id } = await req.json();

    if (!media_upload_id) {
      return new Response(
        JSON.stringify({ error: 'media_upload_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking video status for media_upload_id:', media_upload_id);

    // Get media upload record
    const { data: media, error: mediaError } = await supabase
      .from('media_uploads')
      .select('id, cloudflare_stream_uid, stream_status, stream_ready, gallery_id')
      .eq('id', media_upload_id)
      .single();

    if (mediaError || !media) {
      console.error('Media upload not found:', mediaError);
      return new Response(
        JSON.stringify({ error: 'Media upload not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!media.cloudflare_stream_uid) {
      return new Response(
        JSON.stringify({ error: 'This media upload does not have a Cloudflare Stream UID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Cloudflare credentials
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!accountId || !apiToken) {
      console.error('Cloudflare credentials missing');
      return new Response(
        JSON.stringify({ error: 'Video service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check video status with Cloudflare Stream API
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${media.cloudflare_stream_uid}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const streamData = await streamResponse.json();

    if (!streamResponse.ok || !streamData.success) {
      console.error('Cloudflare Stream API error:', streamData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check video status',
          details: streamData.errors?.[0]?.message || 'Unknown error',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const video = streamData.result;
    console.log('Cloudflare Stream video status:', video.status);

    // Map Cloudflare status to our database status
    let dbStatus = 'queued';
    let isReady = false;

    if (video.status?.state === 'ready') {
      dbStatus = 'ready';
      isReady = true;
    } else if (video.status?.state === 'inprogress') {
      dbStatus = 'encoding';
    } else if (video.status?.state === 'error') {
      dbStatus = 'error';
    }

    // Update database with video status and metadata
    const updateData: any = {
      stream_status: dbStatus,
      stream_ready: isReady,
    };

    // Add thumbnail URL if available
    if (video.thumbnail && isReady) {
      updateData.stream_preview_image = video.thumbnail;
      updateData.thumbnail_url = video.thumbnail;
    }

    // Add video metadata if available
    if (video.meta && isReady) {
      if (video.meta.width) updateData.width = video.meta.width;
      if (video.meta.height) updateData.height = video.meta.height;
    }

    if (video.duration && isReady) {
      updateData.duration_seconds = Math.round(video.duration);
    }

    // Update the database
    const { error: updateError } = await supabase
      .from('media_uploads')
      .update(updateData)
      .eq('id', media_upload_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update media status',
          details: updateError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video status updated:', { media_upload_id, status: dbStatus, ready: isReady });

    return new Response(
      JSON.stringify({
        media_upload_id,
        cloudflare_stream_uid: media.cloudflare_stream_uid,
        status: dbStatus,
        ready: isReady,
        thumbnail: video.thumbnail || null,
        duration: video.duration || null,
        width: video.meta?.width || null,
        height: video.meta?.height || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-stream-video-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to check video status',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
