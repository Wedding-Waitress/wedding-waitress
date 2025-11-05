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

    // Gather event data
    const { data: event } = await supabase
      .from('events')
      .select('*, guests(*), tables(*)')
      .eq('id', event_id)
      .single();

    if (!event) {
      throw new Error('Event not found');
    }

    // Calculate metrics
    const totalGuests = event.guests?.length || 0;
    const attending = event.guests?.filter(g => g.rsvp === 'Attending').length || 0;
    const declined = event.guests?.filter(g => g.rsvp === 'Not Attending').length || 0;
    const pending = event.guests?.filter(g => g.rsvp === 'Pending').length || 0;
    const responseRate = totalGuests > 0 ? ((totalGuests - pending) / totalGuests) * 100 : 0;
    
    const eventDate = new Date(event.date);
    const today = new Date();
    const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Dietary breakdown
    const dietaryBreakdown = {};
    event.guests?.forEach(g => {
      if (g.dietary && g.dietary !== 'NA') {
        dietaryBreakdown[g.dietary] = (dietaryBreakdown[g.dietary] || 0) + 1;
      }
    });

    const metrics = {
      total_guests: totalGuests,
      attending,
      declined,
      pending,
      response_rate: responseRate.toFixed(1),
      days_until_event: daysUntilEvent,
      dietary_breakdown: dietaryBreakdown
    };

    // Generate AI insights
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
            content: 'You are an AI event planning analyst. Analyze event metrics and provide actionable insights, predictions, and recommendations.'
          },
          {
            role: 'user',
            content: `Analyze this wedding event:

Event: ${event.name}
Date: ${event.date} (${daysUntilEvent} days away)
Total Guests: ${totalGuests}
Attending: ${attending}
Declined: ${declined}
Pending RSVPs: ${pending}
Response Rate: ${responseRate.toFixed(1)}%

Provide:
1. Predicted final attendance (based on pending RSVPs)
2. Risk assessment (any concerns?)
3. Cost optimization suggestions
4. Timeline recommendations
5. Seating optimization opportunities`
          }
        ],
        tools: [
          {
            type: 'function',
            name: 'generate_insights',
            parameters: {
              type: 'object',
              properties: {
                predicted_attendance: { type: 'number' },
                confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
                risk_alerts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      severity: { type: 'string', enum: ['warning', 'info', 'success'] },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      action: { type: 'string' }
                    }
                  }
                },
                cost_suggestions: { type: 'array', items: { type: 'string' } },
                timeline_milestones: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      days_from_now: { type: 'number' },
                      title: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                }
              },
              required: ['predicted_attendance', 'confidence_level', 'risk_alerts']
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_insights' } }
      })
    });

    const aiResult = await aiResponse.json();
    const insights = JSON.parse(
      aiResult.choices[0].message.tool_calls[0].function.arguments
    );

    return new Response(
      JSON.stringify({ metrics, insights }),
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