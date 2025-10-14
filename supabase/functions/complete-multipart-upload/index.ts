import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upload-offset, upload-length, tus-resumable',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Invalid JSON received:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session_id, gallery_id, uploaded_parts, caption } = body;

    console.log('Complete multipart upload:', {
      session_id,
      gallery_id,
      uploaded_parts_count: uploaded_parts?.length,
      caption
    });

    // Validate required fields
    const missingFields = [];
    if (!session_id) missingFields.push('session_id');
    if (!gallery_id) missingFields.push('gallery_id');
    if (!uploaded_parts) missingFields.push('uploaded_parts');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          required_fields: ['session_id', 'gallery_id', 'uploaded_parts'],
          received_fields: Object.keys(body)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('gallery_id', gallery_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Upload session not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify all chunks uploaded
    if (uploaded_parts.length !== session.total_chunks) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing chunks',
          expected: session.total_chunks,
          received: uploaded_parts.length 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine chunks into final file
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `${session.file_path}.part${i}`;
      const { data: chunkData, error: chunkError } = await supabase.storage
        .from('event-media')
        .download(chunkPath);

      if (chunkError || !chunkData) {
        console.error(`Failed to download chunk ${i}:`, chunkError);
        return new Response(
          JSON.stringify({ error: `Failed to retrieve chunk ${i}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      chunks.push(new Uint8Array(await chunkData.arrayBuffer()));
    }

    // Combine all chunks
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedFile = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combinedFile.set(chunk, offset);
      offset += chunk.length;
    }

    // Upload final file
    const { error: uploadError } = await supabase.storage
      .from('event-media')
      .upload(session.file_path, combinedFile, {
        contentType: session.mime_type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload final file:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save final file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete chunk files in background
    EdgeRuntime.waitUntil((async () => {
      for (let i = 0; i < session.total_chunks; i++) {
        const chunkPath = `${session.file_path}.part${i}`;
        await supabase.storage.from('event-media').remove([chunkPath]);
      }
      console.log(`Cleaned up ${session.total_chunks} chunks for session ${session_id}`);
    })());

    // Check gallery approval setting
    const { data: gallery } = await supabase
      .from('galleries')
      .select('require_approval')
      .eq('id', gallery_id)
      .single();

    const status = gallery?.require_approval ? 'pending' : 'approved';

    // Get next sequence number atomically
    const { data: seqData, error: seqError } = await supabase
      .rpc('get_next_media_seq_number', {
        _gallery_id: gallery_id,
        _table_name: 'media_uploads'
      });

    if (seqError) {
      console.error('Error getting sequence number:', seqError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate sequence number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const seq_number = seqData as number;

    // Create media upload record
    const { data: media, error: mediaError } = await supabase
      .from('media_uploads')
      .insert({
        gallery_id,
        file_url: session.file_path,
        type: 'video',
        post_type: 'video',
        caption: caption || null,
        status,
        mime_type: session.mime_type,
        file_size_bytes: session.file_size,
        uploader_token: 'chunked-upload',
        seq_number,
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Failed to create media record:', mediaError);
      return new Response(
        JSON.stringify({ error: 'Failed to save media record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete session
    await supabase.from('upload_sessions').delete().eq('id', session_id);

    return new Response(
      JSON.stringify({
        media_id: media.id,
        file_url: media.file_url,
        status: media.status,
        message: 'Video uploaded successfully',
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
