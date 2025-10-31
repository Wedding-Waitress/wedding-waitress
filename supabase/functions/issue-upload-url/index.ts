import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  gallery_slug: string;
  type: 'photo' | 'video' | 'audio' | 'guestbook_text';
  filename: string;
  content_type: string;
  filesize: number;
  caption?: string;
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

    const body: UploadRequest = await req.json();
    const { gallery_slug, type, filename, content_type, filesize, caption } = body;

    // Validate input
    if (!gallery_slug || !type || !filename || !content_type || filesize === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';

    // 1. Resolve gallery_slug to event_id
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, user_id')
      .eq('slug', gallery_slug)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Invalid gallery slug' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch media_gallery_settings and validate
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('media_gallery_settings')
      .select('*')
      .eq('event_id', event.id)
      .single();

    if (settingsError || !settings || !settings.is_active) {
      return new Response(
        JSON.stringify({ error: 'Media gallery not active for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate type-specific permissions and file size
    let maxSizeMB = 0;
    if (type === 'photo') {
      if (!settings.allow_photos) {
        return new Response(
          JSON.stringify({ error: 'Photo uploads not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      maxSizeMB = settings.max_photo_size_mb || 25;
    } else if (type === 'video') {
      if (!settings.allow_videos) {
        return new Response(
          JSON.stringify({ error: 'Video uploads not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      maxSizeMB = settings.max_video_size_mb || 500;
    } else if (type === 'audio') {
      if (!settings.allow_audio) {
        return new Response(
          JSON.stringify({ error: 'Audio uploads not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      maxSizeMB = 20;
    }

    if (filesize > maxSizeMB * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: `File too large. Max size: ${maxSizeMB}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Rate limiting (20 requests per minute per IP+slug)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { data: rateLimitData } = await supabaseAdmin
      .from('upload_rate_limits')
      .select('request_count, window_start')
      .eq('ip_address', clientIP)
      .eq('event_slug', gallery_slug)
      .single();

    if (rateLimitData) {
      const windowStart = new Date(rateLimitData.window_start);
      if (windowStart > oneMinuteAgo) {
        // Within current window
        if (rateLimitData.request_count >= 20) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Increment
        await supabaseAdmin
          .from('upload_rate_limits')
          .update({ request_count: rateLimitData.request_count + 1 })
          .eq('ip_address', clientIP)
          .eq('event_slug', gallery_slug);
      } else {
        // Reset window
        await supabaseAdmin
          .from('upload_rate_limits')
          .update({ request_count: 1, window_start: now.toISOString() })
          .eq('ip_address', clientIP)
          .eq('event_slug', gallery_slug);
      }
    } else {
      // Create new rate limit record
      await supabaseAdmin
        .from('upload_rate_limits')
        .insert({ ip_address: clientIP, event_slug: gallery_slug, request_count: 1 });
    }

    // 5. Generate unique storage path
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const ext = filename.split('.').pop() || 'bin';
    const bucketName = type === 'photo' ? 'media-photos' :
                       type === 'video' ? 'media-videos' :
                       type === 'audio' ? 'media-audio' : '';
    
    const storage_path = `${event.id}/${type}/${timestamp}_${uuid}.${ext}`;

    // 6. Create signed upload URL
    console.log('Creating signed URL:', {
      bucket: bucketName,
      path: storage_path,
      filesize,
      content_type,
      type
    });

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(storage_path);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate upload URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create pending media_items row
    const { data: mediaItem, error: mediaItemError } = await supabaseAdmin
      .from('media_items')
      .insert({
        event_id: event.id,
        type,
        storage_path,
        status: 'uploading',
        filesize,
        caption: caption || null,
      })
      .select('id')
      .single();

    if (mediaItemError || !mediaItem) {
      console.error('Media item creation error:', mediaItemError);
      return new Response(
        JSON.stringify({ error: 'Failed to create media record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Return upload URL and metadata
    return new Response(
      JSON.stringify({
        upload_url: signedUrlData.signedUrl,
        media_item_id: mediaItem.id,
        storage_path,
        token: signedUrlData.token,
        expires_in: 3600,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in issue-upload-url:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
