import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  cloudflare_stream_uid: string;
  media_item_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body: StatusRequest = await req.json();
    const { cloudflare_stream_uid, media_item_id } = body;

    // Validate input
    if (!cloudflare_stream_uid || !media_item_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Cloudflare Stream API for video status
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflare_stream_uid}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        },
      }
    );

    if (!streamResponse.ok) {
      throw new Error(`Cloudflare Stream API error: ${streamResponse.statusText}`);
    }

    const streamData = await streamResponse.json();
    const video = streamData.result;

    if (!video) {
      return new Response(
        JSON.stringify({ error: 'Video not found in Cloudflare Stream' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cloudflareStatus = video.status?.state || 'unknown';
    let newStatus = 'processing';
    const updateData: any = {};

    // Map Cloudflare status to our status
    if (cloudflareStatus === 'ready') {
      newStatus = 'ready';
      
      // Extract video metadata
      if (video.duration) {
        updateData.duration_sec = Math.round(video.duration);
      }
      if (video.input?.width) {
        updateData.width = video.input.width;
      }
      if (video.input?.height) {
        updateData.height = video.input.height;
      }
      
      // Store thumbnail path from Cloudflare
      if (video.thumbnail) {
        updateData.thumbnail_path = video.thumbnail;
      }
    } else if (cloudflareStatus === 'error' || cloudflareStatus === 'failed') {
      newStatus = 'failed';
    } else if (cloudflareStatus === 'inprogress' || cloudflareStatus === 'queued') {
      newStatus = 'processing';
    }

    // Update media_items record
    await supabaseAdmin
      .from('media_items')
      .update({
        status: newStatus,
        ...updateData,
      })
      .eq('id', media_item_id);

    return new Response(
      JSON.stringify({
        status: newStatus,
        cloudflare_status: cloudflareStatus,
        media_item_id,
        duration_sec: updateData.duration_sec,
        width: updateData.width,
        height: updateData.height,
        thumbnail_url: updateData.thumbnail_path,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-video-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
