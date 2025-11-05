import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, event_id, user_type } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load event data & knowledge base
    const { data: event } = await supabase
      .from('events')
      .select('*, guests(*), tables(*)')
      .eq('id', event_id)
      .single();

    const { data: knowledge } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .eq('event_id', event_id)
      .eq('is_active', true);

    // Build system prompt
    const attendingCount = event?.guests?.filter(g => g.rsvp === 'Attending').length || 0;
    const declinedCount = event?.guests?.filter(g => g.rsvp === 'Not Attending').length || 0;
    const pendingCount = event?.guests?.filter(g => g.rsvp === 'Pending').length || 0;

    const systemPrompt = `You are the AI assistant for ${event?.name} on ${event?.date}.

EVENT DETAILS:
- Venue: ${event?.venue}
- Date: ${event?.date}
- Time: ${event?.start_time} - ${event?.finish_time}
- Total Guests: ${event?.guests?.length || 0}
- Total Tables: ${event?.tables?.length || 0}

RSVP STATUS:
- Attending: ${attendingCount}
- Declined: ${declinedCount}
- Pending: ${pendingCount}

${knowledge && knowledge.length > 0 ? `CUSTOM KNOWLEDGE BASE:
${knowledge.map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')}` : ''}

CAPABILITIES:
${user_type === 'host' ? `
- Answer questions about guest lists, RSVPs, dietary requirements
- Provide statistics and analytics
- Suggest seating arrangements
- Help with event planning decisions
` : `
- Answer questions about the event (venue, time, dress code)
- Provide directions and parking information
- Explain RSVP process
- Share event timeline and schedule
`}

Be friendly, helpful, and concise. Use emojis occasionally. If you don't know something, say so.`;

    // Call Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true
      })
    });

    // Return streaming response
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});