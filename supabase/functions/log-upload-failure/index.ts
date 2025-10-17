// Priority 3: Production monitoring for upload failures
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      gallery_slug,
      error_type,
      error_message,
      status_code,
      file_name,
      file_size,
      content_type,
      user_agent,
      retry_count,
    } = await req.json();

    console.log('📊 Logging upload failure:', {
      gallery_slug,
      error_type,
      file_name,
    });

    // Get gallery ID from slug
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('slug', gallery_slug)
      .single();

    if (!gallery) {
      console.error('Gallery not found for slug:', gallery_slug);
      return new Response(
        JSON.stringify({ error: 'Gallery not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Insert failure log into analytics table
    const { error: insertError } = await supabase
      .from('gallery_analytics')
      .insert({
        gallery_id: gallery.id,
        event_type: 'upload_failure',
        metadata: {
          error_type,
          error_message,
          status_code,
          file_name,
          file_size,
          content_type,
          user_agent,
          retry_count,
          timestamp: new Date().toISOString(),
        },
      });

    if (insertError) {
      console.error('Failed to insert analytics:', insertError);
      throw insertError;
    }

    console.log('✅ Upload failure logged to analytics');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error logging upload failure:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
