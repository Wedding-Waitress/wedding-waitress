import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcknowledgeRequest {
  shareToken: string;
  acknowledgerName?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareToken, acknowledgerName }: AcknowledgeRequest = await req.json();

    // Validation
    if (!shareToken || typeof shareToken !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid share token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate acknowledger name
    const sanitizedName = acknowledgerName?.trim().slice(0, 100) || 'Anonymous';

    // Extract IP from request headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                req.headers.get('x-real-ip') ||
                'unknown';
    
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) || 'unknown';

    console.log('Acknowledgment request:', { shareToken: shareToken.slice(0, 8) + '...', sanitizedName, ip });

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find questionnaire by token
    const { data: questionnaire, error: qError } = await supabase
      .from('dj_questionnaires')
      .select('id, status, event_id')
      .eq('share_token', shareToken)
      .single();

    if (qError || !questionnaire) {
      console.error('Questionnaire not found:', qError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already approved
    if (questionnaire.status === 'approved') {
      console.log('Questionnaire already approved:', questionnaire.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Questionnaire was already approved',
          alreadyApproved: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert acknowledgment log
    const { error: logError } = await supabase
      .from('dj_questionnaire_acknowledgments')
      .insert({
        questionnaire_id: questionnaire.id,
        acknowledged_by_name: sanitizedName,
        acknowledged_from_ip: ip,
        user_agent: userAgent,
      });

    if (logError) {
      console.error('Failed to insert acknowledgment log:', logError);
      throw logError;
    }

    // Update questionnaire status
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('dj_questionnaires')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by_name: sanitizedName,
        approved_from_ip: ip,
      })
      .eq('id', questionnaire.id);

    if (updateError) {
      console.error('Failed to update questionnaire status:', updateError);
      throw updateError;
    }

    console.log('Questionnaire approved successfully:', questionnaire.id);

    return new Response(
      JSON.stringify({
        success: true,
        approvedAt: now,
        approvedBy: sanitizedName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Acknowledgment error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
