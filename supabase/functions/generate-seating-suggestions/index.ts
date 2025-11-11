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

    // Fetch guests and tables
    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', event_id);

    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', event_id);

    if (!guests || !tables || guests.length === 0 || tables.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI
    const context = {
      guests: guests.map(g => ({
        id: g.id,
        name: `${g.first_name} ${g.last_name}`,
        dietary: g.dietary,
        family_group: g.family_group,
        relation_partner: g.relation_partner,
        relation_role: g.relation_role,
        current_table: g.table_id,
        notes: g.notes
      })),
      tables: tables.map(t => {
        const currentGuests = guests.filter(g => g.table_id === t.id);
        return {
          id: t.id,
          name: t.name,
          capacity: t.limit_seats,
          current_count: currentGuests.length,
          available_seats: t.limit_seats - currentGuests.length
        };
      })
    };

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
          {
            role: 'system',
            content: `You are an expert wedding seating planner. Analyze guests and suggest optimal table assignments based on:
1. Dietary restrictions (seat similar diets together for kitchen efficiency)
2. Family groups (keep families together)
3. Relationship roles (bridesmaids near bride, groomsmen near groom)
4. Table capacity constraints
5. Balanced distribution across tables

Return suggestions as JSON array with: guest_id, suggested_table_id, confidence_score (0.00-1.00), reasoning (brief explanation).
Only suggest changes for guests who would benefit from reassignment.`
          },
          {
            role: 'user',
            content: JSON.stringify(context)
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_seating',
              description: 'Return seating suggestions for guests',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        guest_id: { type: 'string' },
                        suggested_table_id: { type: 'string' },
                        confidence_score: { type: 'number', minimum: 0, maximum: 1 },
                        reasoning: { type: 'string' }
                      },
                      required: ['guest_id', 'suggested_table_id', 'confidence_score', 'reasoning']
                    }
                  }
                },
                required: ['suggestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_seating' } }
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, text);
      return new Response(
        JSON.stringify({ suggestions: [], error: 'AI gateway error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiResult, null, 2));

    let suggestions: any[] = [];

    // Preferred: tool_calls structured output
    const choice = aiResult.choices?.[0];
    const toolCallArgs = choice?.message?.tool_calls?.[0]?.function?.arguments;
    if (toolCallArgs) {
      try {
        const parsedArgs = JSON.parse(toolCallArgs);
        if (Array.isArray(parsedArgs?.suggestions)) {
          suggestions = parsedArgs.suggestions;
        }
      } catch (e) {
        console.error('Failed to parse tool_call arguments:', e);
      }
    }

    // Fallback: message content contains JSON
    if (suggestions.length === 0) {
      const content = choice?.message?.content;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed?.suggestions)) {
            suggestions = parsed.suggestions;
          }
        } catch (e) {
          console.warn('AI content was not valid JSON:', e);
        }
      }
    }

    // Ensure array
    suggestions = Array.isArray(suggestions) ? suggestions : [];

    // Clear previous suggestions for this event
    await supabase
      .from('ai_seating_suggestions')
      .delete()
      .eq('event_id', event_id);

    // Store new suggestions
    if (suggestions && suggestions.length > 0) {
      await supabase.from('ai_seating_suggestions').insert(
        suggestions.map(s => ({
          event_id,
          guest_id: s.guest_id,
          suggested_table_id: s.suggested_table_id,
          confidence_score: s.confidence_score,
          reasoning: s.reasoning,
          status: 'pending'
        }))
      );
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});