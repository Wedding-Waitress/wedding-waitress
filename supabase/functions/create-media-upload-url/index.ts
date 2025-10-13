import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PHOTO_SIZE_MB = 250;
const MAX_VIDEO_SIZE_MB = 250;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= 10) {
    return false;
  }
  
  limit.count++;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { gallerySlug, filename, contentType, file_size } = await req.json();

    console.log('Create upload URL request:', { gallerySlug, filename, contentType, file_size });

    // Normalize HEIC/HEIF to JPEG
    let targetContentType = contentType;
    let targetFilename = filename;
    
    if (contentType === 'image/heic' || contentType === 'image/heif') {
      targetContentType = 'image/jpeg';
      targetFilename = filename.replace(/\.(heic|heif)$/i, '.jpg');
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
    
    if (!isImage && !isVideo) {
      return new Response(
        JSON.stringify({ error: 'That file type isn\'t supported.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    const maxSizeBytes = isImage 
      ? MAX_PHOTO_SIZE_MB * 1024 * 1024
      : MAX_VIDEO_SIZE_MB * 1024 * 1024;
    
    if (file_size > maxSizeBytes) {
      return new Response(
        JSON.stringify({ 
          error: isImage
            ? `That file is too large. Max: ${MAX_PHOTO_SIZE_MB} MB photos.`
            : `That file is too large. Max: ${MAX_VIDEO_SIZE_MB} MB videos.`
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve gallery from slug
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('id, is_active, show_public_gallery')
      .eq('slug', gallerySlug)
      .single();

    if (galleryError || !gallery) {
      console.error('Gallery not found:', galleryError);
      return new Response(
        JSON.stringify({ error: 'Gallery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!gallery.is_active || !gallery.show_public_gallery) {
      return new Response(
        JSON.stringify({ error: 'This gallery is not accepting uploads right now.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Supabase Storage for both photos and videos
    if (isVideo || isImage) {
      // === SUPABASE STORAGE FOR PHOTOS AND VIDEOS ===
      console.log(`Creating Supabase Storage upload URL for ${isVideo ? 'video' : 'photo'}`);
      
      const uuid = crypto.randomUUID();
      const safeName = targetFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `galleries/${gallery.id}/${uuid}/${safeName}`;

      // Create signed upload URL (valid for 1 hour)
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('event-media')
        .createSignedUploadUrl(filePath, {
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload URL creation error:', uploadError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create upload URL',
            details: uploadError.message,
            code: (uploadError as any).statusCode,
            troubleshooting: uploadError.message?.includes('bucket')
              ? 'Storage bucket may not exist or is misconfigured'
              : uploadError.message?.includes('policy')
              ? 'Storage permissions may not allow this operation'
              : 'Please try again or contact support'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Upload URL created successfully:', filePath);

      return new Response(
        JSON.stringify({
          signed_url: uploadData.signedUrl,
          file_path: filePath,
          token: uploadData.token,
          gallery_id: gallery.id,
          content_type: targetContentType,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in create-media-upload-url:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create upload URL',
        details: error.toString(),
        troubleshooting: 'Check that the gallery exists and is active'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});