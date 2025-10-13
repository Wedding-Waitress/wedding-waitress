import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { session_id, gallery_id, uploaded_parts, caption } = await req.json();

    if (!session_id || !gallery_id || !uploaded_parts) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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
