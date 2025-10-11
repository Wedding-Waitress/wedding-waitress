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
      event_id,
      token,
      file_path,
      type,
      caption,
      width,
      height,
      file_size,
      mime_type
    } = await req.json();

    console.log('Confirm upload request:', { event_id, token, file_path, type });

    // Validate token
    const { data: validation } = await supabase
      .rpc('validate_media_token', { _event_id: event_id, _token: token });

    if (!validation || !validation[0]?.is_valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requireApproval = validation[0].require_approval;

    // Create media record
    const { data: mediaRecord, error: mediaError } = await supabase
      .from('media_uploads')
      .insert({
        event_id,
        uploader_token: token,
        type,
        caption: caption || null,
        file_url: file_path,
        status: requireApproval ? 'pending' : 'approved',
        file_size_bytes: file_size,
        mime_type,
        width,
        height,
        approved_at: requireApproval ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Media record creation error:', mediaError);
      throw mediaError;
    }

    // Increment token usage
    await supabase
      .from('media_upload_tokens')
      .update({
        uploads_used: supabase.sql`uploads_used + 1`,
        last_used_at: new Date().toISOString(),
      })
      .eq('event_id', event_id)
      .eq('token', token);

    console.log('Upload confirmed successfully:', mediaRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        media_id: mediaRecord.id,
        status: mediaRecord.status,
        requires_approval: requireApproval,
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