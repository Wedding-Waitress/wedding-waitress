// Authoritative deletion for general gallery media (shared photos/videos + Digital Photo Booth).
//
// Security model:
// - Caller must present a valid Supabase JWT (organiser). No service-role key ever leaves the server.
// - Ownership is enforced INSIDE the database by delete_event_media_items(), which runs as the
//   caller (auth.uid()) and checks can_access_event(). Private Guestbook content is excluded there.
// - Storage objects are removed with the service role ONLY for rows the database confirmed deleted,
//   so a caller can never target another event's or another item's file.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Authentication required' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const rawIds: unknown = (body as any)?.itemIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return json({ error: 'itemIds must be a non-empty array' }, 400);
    }
    if (rawIds.length > 500) {
      return json({ error: 'Too many items in one request (max 500)' }, 400);
    }
    const itemIds = Array.from(
      new Set(rawIds.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v))),
    );
    if (itemIds.length === 0) return json({ error: 'No valid item IDs supplied' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Caller-scoped client — auth.uid() inside the RPC is the signed-in organiser.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Authentication required' }, 401);

    const { data: deletedRows, error: delErr } = await userClient.rpc('delete_event_media_items', {
      _item_ids: itemIds,
    });
    if (delErr) return json({ error: delErr.message || 'Delete failed' }, 400);

    const rows = (deletedRows || []) as { id: string; storage_path: string; event_id: string }[];
    const deletedIds = rows.map((r) => r.id);
    const failedIds = itemIds.filter((id) => !deletedIds.includes(id));

    // Storage cleanup (service role) — only for confirmed-deleted rows.
    let storageFailedPaths: string[] = [];
    const paths = rows.map((r) => r.storage_path).filter(Boolean);
    if (paths.length > 0) {
      const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { error: storageErr } = await admin.storage.from('event-media').remove(paths);
      if (storageErr) {
        storageFailedPaths = paths;
        // The database rows are already gone — the media stays deleted everywhere.
        // Log the orphaned objects so they can be swept later.
        console.error('event-media storage cleanup failed', {
          error: storageErr.message,
          paths,
        });
      }
    }

    if (deletedIds.length === 0) {
      return json(
        { deletedIds, failedIds, storageFailedPaths, error: 'No media was deleted. You may not have permission, or the items no longer exist.' },
        403,
      );
    }

    return json({ deletedIds, failedIds, storageFailedPaths });
  } catch (e) {
    console.error('delete-event-media error', e);
    return json({ error: (e as Error)?.message || 'Unexpected error' }, 500);
  }
});
