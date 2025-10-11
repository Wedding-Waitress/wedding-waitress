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

    const { event_id, token, type, file_name, file_size } = await req.json();

    console.log('Create upload URL request:', { event_id, token, type, file_name, file_size });

    // Validate token and check limits
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_media_token', { _event_id: event_id, _token: token });

    if (validationError) {
      console.error('Validation error:', validationError);
      throw new Error('Token validation failed');
    }

    if (!validation || validation.length === 0 || !validation[0].is_valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = validation[0];

    if (!validationResult.can_upload) {
      return new Response(
        JSON.stringify({ error: 'Upload limit reached' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file type is allowed
    if (type === 'image' && !validationResult.allow_photos) {
      return new Response(
        JSON.stringify({ error: 'Photo uploads are disabled for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'video' && !validationResult.allow_videos) {
      return new Response(
        JSON.stringify({ error: 'Video uploads are disabled for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const filePath = `${event_id}/${type}s/${timestamp}-${randomId}-${file_name}`;

    // Create signed upload URL (valid for 1 hour)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('event-media')
      .createSignedUploadUrl(filePath, {
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload URL creation error:', uploadError);
      throw uploadError;
    }

    console.log('Upload URL created successfully:', filePath);

    return new Response(
      JSON.stringify({
        upload_url: uploadData.signedUrl,
        file_path: filePath,
        token: uploadData.token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-media-upload-url:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});