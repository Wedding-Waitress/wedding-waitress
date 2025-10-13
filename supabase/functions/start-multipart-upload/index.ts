import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upload-offset, upload-length, tus-resumable',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAX_VIDEO_SIZE_MB = 2048; // 2 GB max
const CHUNK_SIZE_MB = 10; // 10 MB chunks for better network tolerance
const MAX_CHUNKS = 256; // 2 GB / 10 MB
const SESSION_EXPIRY_HOURS = 48; // Longer session for slow uploads

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again in a few minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Invalid JSON received:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON',
          received_content_type: req.headers.get('content-type')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gallerySlug, filename, contentType, file_size, chunkCount } = body;

    console.log('Start multipart upload request:', {
      gallerySlug,
      filename,
      contentType,
      file_size,
      chunkCount,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Validate each required field individually
    const missingFields = [];
    if (!gallerySlug) missingFields.push('gallerySlug');
    if (!filename) missingFields.push('filename');
    if (!contentType) missingFields.push('contentType');
    if (file_size === undefined || file_size === null) missingFields.push('file_size');
    if (chunkCount === undefined || chunkCount === null) missingFields.push('chunkCount');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          required_fields: ['gallerySlug', 'filename', 'contentType', 'file_size', 'chunkCount'],
          received_fields: Object.keys(body),
          details: 'Ensure all required fields are included in the request body'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field types
    if (typeof file_size !== 'number' || file_size <= 0) {
      console.error('Invalid file_size:', { file_size, type: typeof file_size });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid file_size',
          details: 'file_size must be a positive number',
          received: { file_size, type: typeof file_size }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof chunkCount !== 'number' || chunkCount <= 0) {
      console.error('Invalid chunkCount:', { chunkCount, type: typeof chunkCount });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid chunkCount',
          details: 'chunkCount must be a positive number',
          received: { chunkCount, type: typeof chunkCount }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content type is a supported video format
    const ALLOWED_VIDEO_TYPES = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-m4v',
      'video/hevc',
      'video/h265',
      'video/h264',
      'video/mpeg',
      'video/3gpp',
      'video/3gpp2'
    ];

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      console.error('Unsupported video format:', contentType);
      return new Response(
        JSON.stringify({ 
          error: `Unsupported video format: ${contentType}`,
          details: 'Please use MP4, MOV, WebM, or other supported formats',
          allowed_types: ALLOWED_VIDEO_TYPES
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    const sizeMB = file_size / (1024 * 1024);
    const maxSizeMB = MAX_VIDEO_SIZE_MB;
    if (sizeMB > maxSizeMB) {
      console.error('File too large:', { sizeMB, maxSizeMB });
      return new Response(
        JSON.stringify({ 
          error: `File too large. Max size: ${Math.round(maxSizeMB / 1024)} GB`,
          details: `Your file is ${Math.round(sizeMB)} MB, but the limit is ${Math.round(maxSizeMB)} MB`,
          received_size_mb: Math.round(sizeMB),
          max_size_mb: maxSizeMB
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate chunk count
    if (chunkCount > MAX_CHUNKS) {
      return new Response(
        JSON.stringify({ error: `Too many chunks. Max: ${MAX_CHUNKS}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch gallery
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('id, is_active, show_public_gallery')
      .eq('slug', gallerySlug)
      .single();

    if (galleryError || !gallery) {
      return new Response(
        JSON.stringify({ error: 'Gallery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!gallery.is_active || !gallery.show_public_gallery) {
      return new Response(
        JSON.stringify({ error: 'Gallery not accepting uploads' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session ID and file path
    const sessionId = crypto.randomUUID();
    const filePath = `galleries/${gallery.id}/${sessionId}/${filename}`;

    // Create upload session in database
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        id: sessionId,
        gallery_id: gallery.id,
        file_path: filePath,
        file_name: filename,
        file_size: file_size,
        mime_type: contentType,
        total_chunks: chunkCount,
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create upload session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate chunk upload URLs
    const chunkUrls = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkPath = `${filePath}.part${i}`;
      const { data: signedData, error: signError } = await supabase.storage
        .from('event-media')
        .createSignedUploadUrl(chunkPath);

      if (signError) {
        console.error('Error creating signed URL:', signError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate upload URLs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      chunkUrls.push({
        chunk_index: i,
        upload_url: signedData.signedUrl,
        token: signedData.token,
        path: signedData.path,
      });
    }

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        gallery_id: gallery.id,
        chunk_urls: chunkUrls,
        expires_at: expiresAt,
        file_path: filePath,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
