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
    // Validate input
    const body = await req.json();
    const { event_id } = body;

    if (!event_id || typeof event_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid event_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(event_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid UUID format for event_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    const userId = claimsData.claims.sub;

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns or can access this event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', event_id)
      .single();

    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (eventData.user_id !== userId) {
      // Check collaborator access
      const { data: collab } = await supabase
        .from('event_collaborators')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!collab) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to event' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

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
      const remaining = new Map(tables.map((table) => [
        table.id,
        Math.max(0, Number(table.limit_seats || 0) - guests.filter((guest) => guest.table_id === table.id).length),
      ]));
      const familyTables = new Map<string, string>();
      for (const guest of guests) {
        if (guest.family_group && guest.table_id) familyTables.set(guest.family_group, guest.table_id);
      }
      const suggestions = [];
      for (const guest of guests.filter((row) => !row.table_id)) {
        const familyTable = guest.family_group ? familyTables.get(guest.family_group) : undefined;
        let tableId = familyTable && (remaining.get(familyTable) || 0) > 0 ? familyTable : undefined;
        if (!tableId) {
          tableId = [...remaining.entries()].sort((a, b) => b[1] - a[1]).find(([, seats]) => seats > 0)?.[0];
        }
        if (!tableId) break;
        remaining.set(tableId, (remaining.get(tableId) || 0) - 1);
        if (guest.family_group) familyTables.set(guest.family_group, tableId);
        suggestions.push({
          guest_id: guest.id,
          suggested_table_id: tableId,
          confidence_score: familyTable === tableId ? 0.85 : 0.65,
          reasoning: familyTable === tableId ? 'Keeps this family group together.' : 'Uses the table with the most available seats.',
        });
      }
      await supabase.from('ai_seating_suggestions').delete().eq('event_id', event_id).eq('status', 'pending');
      if (suggestions.length) {
        const { error: insertError } = await supabase.from('ai_seating_suggestions').insert(
          suggestions.map((suggestion) => ({ event_id, ...suggestion, status: 'pending' })),
        );
        if (insertError) throw insertError;
      }
      return new Response(JSON.stringify({ suggestions, suggestions_count: suggestions.length, source: 'private_rules' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      JSON.stringify({ suggestions, suggestions_count: suggestions.length, source: 'ai' }),
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
