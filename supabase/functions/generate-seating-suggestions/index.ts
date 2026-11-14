import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { requirePlanningEventOwner } from '../_shared/team-planning-access.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
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
    await requirePlanningEventOwner(supabase, userId, event_id);

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

    // Private seating suggestions stay inside the application backend.
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
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Could not generate seating suggestions' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
