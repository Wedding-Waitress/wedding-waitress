import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmRequest {
  media_item_id: string;
  storage_path: string;
  type: 'photo' | 'video' | 'audio';
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

    const body: ConfirmRequest = await req.json();
    const { media_item_id, storage_path, type } = body;

    // Validate input
    if (!media_item_id || !storage_path || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify media_items row exists with status = 'uploading'
    const { data: mediaItem, error: fetchError } = await supabaseAdmin
      .from('media_items')
      .select('*')
      .eq('id', media_item_id)
      .eq('status', 'uploading')
      .single();

    if (fetchError || !mediaItem) {
      return new Response(
        JSON.stringify({ error: 'Media item not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Update status to 'processing'
    await supabaseAdmin
      .from('media_items')
      .update({ status: 'processing' })
      .eq('id', media_item_id);

    const bucketName = type === 'photo' ? 'media-photos' :
                       type === 'video' ? 'media-videos' :
                       type === 'audio' ? 'media-audio' : '';

    // 3. Process based on type
    if (type === 'photo') {
      // For photos: extract metadata and generate thumbnail
      try {
        // Download the file
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from(bucketName)
          .download(storage_path);

        if (downloadError || !fileData) {
          throw new Error('Failed to download file');
        }

        // Get image dimensions using Image API
        const arrayBuffer = await fileData.arrayBuffer();
        const blob = new Blob([arrayBuffer]);
        
        // Create a simple thumbnail (resize to 400px width maintaining aspect ratio)
        // Note: In production, use a proper image processing library
        const thumbnailPath = storage_path.replace(/\.[^.]+$/, '_thumb.jpg');

        // For now, just copy the original as thumbnail (placeholder)
        // In production, implement proper thumbnail generation
        const { error: thumbUploadError } = await supabaseAdmin.storage
          .from('media-thumbs')
          .upload(thumbnailPath, fileData, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (thumbUploadError) {
          console.error('Thumbnail upload error:', thumbUploadError);
        }

        // Update media_items with metadata
        await supabaseAdmin
          .from('media_items')
          .update({
            status: 'ready',
            thumbnail_path: thumbnailPath,
          })
          .eq('id', media_item_id);

        return new Response(
          JSON.stringify({
            status: 'ready',
            media_item_id,
            thumbnail_path: thumbnailPath,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Photo processing error:', error);
        await supabaseAdmin
          .from('media_items')
          .update({ status: 'failed' })
          .eq('id', media_item_id);
        throw error;
      }
    } else if (type === 'video') {
      // For videos: upload to Cloudflare Stream
      try {
        const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
        const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

        if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
          throw new Error('Cloudflare credentials not configured');
        }

        // Download video from Supabase Storage
        const { data: videoData, error: downloadError } = await supabaseAdmin.storage
          .from(bucketName)
          .download(storage_path);

        if (downloadError || !videoData) {
          throw new Error('Failed to download video');
        }

        // Upload to Cloudflare Stream using TUS protocol
        const uploadResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            },
            body: videoData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(`Cloudflare Stream upload failed: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        const streamUid = uploadResult.result?.uid;

        if (!streamUid) {
          throw new Error('No Stream UID returned from Cloudflare');
        }

        // Update media_items with Cloudflare Stream UID
        await supabaseAdmin
          .from('media_items')
          .update({
            status: 'processing',
            cloudflare_stream_uid: streamUid,
          })
          .eq('id', media_item_id);

        return new Response(
          JSON.stringify({
            status: 'processing',
            media_item_id,
            cloudflare_stream_uid: streamUid,
            message: 'Video uploaded to Cloudflare Stream. Encoding in progress.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Video processing error:', error);
        await supabaseAdmin
          .from('media_items')
          .update({ status: 'failed' })
          .eq('id', media_item_id);
        throw error;
      }
    } else if (type === 'audio') {
      // For audio: mark as ready (no special processing needed)
      try {
        await supabaseAdmin
          .from('media_items')
          .update({
            status: 'ready',
          })
          .eq('id', media_item_id);

        return new Response(
          JSON.stringify({
            status: 'ready',
            media_item_id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Audio processing error:', error);
        await supabaseAdmin
          .from('media_items')
          .update({ status: 'failed' })
          .eq('id', media_item_id);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
