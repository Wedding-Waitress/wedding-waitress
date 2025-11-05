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
    const { event_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch event with all related data
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError) throw eventError;

    // Fetch guests
    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', event_id);

    // Fetch tables
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', event_id);

    // Fetch existing knowledge base FAQs
    const { data: existingKB } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .eq('event_id', event_id)
      .eq('category', 'faq')
      .eq('is_active', true);

    // Calculate event metrics
    const daysUntilEvent = Math.ceil(
      (new Date(eventData.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const dietaryBreakdown: Record<string, number> = {};
    guests?.forEach(g => {
      if (g.dietary) {
        dietaryBreakdown[g.dietary] = (dietaryBreakdown[g.dietary] || 0) + 1;
      }
    });

    const rsvpStats = {
      attending: guests?.filter(g => g.rsvp === 'Attending').length || 0,
      declined: guests?.filter(g => g.rsvp === 'Not Attending').length || 0,
      pending: guests?.filter(g => g.rsvp === 'Pending').length || 0,
    };

    // Detect event characteristics
    const venueStr = eventData.venue?.toLowerCase() || '';
    const isOutdoor = venueStr.includes('garden') || venueStr.includes('outdoor') || venueStr.includes('park');
    const isFormal = venueStr.includes('ballroom') || venueStr.includes('hotel') || venueStr.includes('club');
    const hasComplexDietary = Object.keys(dietaryBreakdown).length > 3;
    const isLargeEvent = (guests?.length || 0) > 150;

    // Build AI prompt
    const systemPrompt = `You are an expert wedding planner analyzing event details.

EVENT CONTEXT:
- Name: ${eventData.name}
- Venue: ${eventData.venue || 'Not specified'}
- Date: ${eventData.date} (${daysUntilEvent} days away)
- Time: ${eventData.start_time || 'TBD'} - ${eventData.finish_time || 'TBD'}
- Guest Count: ${guests?.length || 0}
- RSVP Status: ${rsvpStats.attending} attending, ${rsvpStats.pending} pending
- Dietary Requirements: ${Object.entries(dietaryBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None specified'}
- Venue Type: ${isOutdoor ? 'Outdoor' : 'Indoor'}, ${isFormal ? 'Formal' : 'Casual'}
- Tables: ${tables?.length || 0}

EXISTING FAQs (${existingKB?.length || 0} already covered):
${existingKB?.map(kb => `- ${kb.question}`).join('\n') || 'None yet'}

GENERATE 5-10 RELEVANT FAQ SUGGESTIONS:

Consider these priority areas:
${isOutdoor ? '- Weather contingency plans (outdoor venue detected)' : ''}
${hasComplexDietary ? '- Dietary accommodations (multiple dietary needs detected)' : ''}
${isLargeEvent ? '- Crowd management, parking, shuttles (large event detected)' : ''}
${rsvpStats.pending > (guests?.length || 0) * 0.3 ? '- RSVP reminders and deadline (many pending RSVPs)' : ''}
${daysUntilEvent < 30 ? '- Last-minute logistics and arrival details (event is soon)' : ''}

For each FAQ:
1. Avoid duplicating existing FAQs
2. Use specific event details when possible (actual venue name, times, etc.)
3. Provide actionable, clear answers
4. Focus on questions guests ACTUALLY ask

Return FAQs that are:
- High priority: Essential info all guests need
- Medium priority: Helpful but not critical
- Low priority: Nice-to-have additional context`;

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
          { 
            role: 'user', 
            content: 'Generate FAQ suggestions for this event. Return as structured JSON.' 
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_faqs',
              description: 'Return FAQ suggestions',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        answer: { type: 'string' },
                        category: { 
                          type: 'string',
                          enum: ['venue', 'timing', 'attire', 'food', 'policies', 'logistics', 'other']
                        },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                        reasoning: { type: 'string' }
                      },
                      required: ['question', 'answer', 'category', 'priority', 'reasoning']
                    }
                  }
                },
                required: ['suggestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_faqs' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices?.[0]?.message?.tool_calls?.[0]) {
      console.error('Invalid AI response structure:', JSON.stringify(aiData));
      throw new Error('AI did not return structured suggestions');
    }

    const suggestions = JSON.parse(
      aiData.choices[0].message.tool_calls[0].function.arguments
    ).suggestions;

    return new Response(
      JSON.stringify({
        suggestions,
        event_context: {
          name: eventData.name,
          guest_count: guests?.length || 0,
          days_until_event: daysUntilEvent,
          existing_faq_count: existingKB?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
