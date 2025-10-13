import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_VIDEO_SIZE_GB = 2;
const CHUNK_SIZE_MB = 8;
const MAX_CHUNKS = 256;
const SESSION_EXPIRY_HOURS = 24;

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
    const { gallerySlug, filename, contentType, file_size, chunkCount } = await req.json();

    if (!gallerySlug || !filename || !contentType || !file_size || !chunkCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    const sizeMB = file_size / (1024 * 1024);
    const maxSizeMB = MAX_VIDEO_SIZE_GB * 1024;
    if (sizeMB > maxSizeMB) {
      return new Response(
        JSON.stringify({ error: `File too large. Max size: ${MAX_VIDEO_SIZE_GB} GB` }),
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
