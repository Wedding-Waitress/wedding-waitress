import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_RE = /^[0-9a-f]{64}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const galleryToken = typeof body?.galleryToken === 'string' ? body.galleryToken : '';
    const itemId = typeof body?.itemId === 'string' ? body.itemId : '';
    const deleteToken = typeof body?.deleteToken === 'string' ? body.deleteToken : '';
    if (!galleryToken || galleryToken.length > 256 || !UUID_RE.test(itemId) || !SECRET_RE.test(deleteToken)) {
      return json({ error: 'Invalid deletion request' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: storagePath, error: deleteError } = await admin.rpc('consume_guestbook_media_delete', {
      _token: galleryToken,
      _item_id: itemId,
      _delete_token: deleteToken,
    });
    if (deleteError) return json({ error: 'Could not remove this recording' }, 400);
    if (!storagePath) return json({ error: 'Recording not found' }, 404);

    const { error: storageError } = await admin.storage.from('event-media').remove([storagePath]);
    if (storageError) {
      console.error('guestbook storage cleanup failed', { itemId, storagePath, error: storageError.message });
      return json({ deleted: true, storageCleanupPending: true });
    }
    return json({ deleted: true, storageCleanupPending: false });
  } catch (error) {
    console.error('delete-guestbook-submission error', error);
    return json({ error: 'Unexpected deletion error' }, 500);
  }
});
