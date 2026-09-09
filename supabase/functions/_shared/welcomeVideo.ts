/** Server-only helpers. All video operations remain scoped to an authenticated event owner. */
export async function requireVideoOwner(db: any, eventId: string, userId: string) {
  const result = await db.from('events').select('id').eq('id', eventId).eq('user_id', userId).single();
  if (result.error || !result.data) throw new Error('Event not found or unauthorized');
}

export async function deleteStreamVideo(uid: string, account: string, token: string, request = fetch) {
  if (!/^[a-f0-9]{32}$/i.test(uid)) throw new Error('Invalid video identifier');
  const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/${uid}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  // A retry after an earlier successful remote delete is safe.
  if (!response.ok && response.status !== 404) throw new Error('Hosted video cleanup failed; retry removal');
}

export async function readVideoConfig(db: any, eventId: string) {
  const result = await db.from('live_view_module_settings').select('welcome_video_config').eq('event_id', eventId).single();
  if (result.error) throw result.error;
  return result.data.welcome_video_config;
}

export async function saveVideoConfig(db: any, eventId: string, previous: any, config: any) {
  let query = db.from('live_view_module_settings').update({ welcome_video_config: config }).eq('event_id', eventId);
  query = previous == null ? query.is('welcome_video_config', null) : query.eq('welcome_video_config', JSON.stringify(previous));
  const result = await query.select('event_id');
  if (result.error) throw result.error;
  if (!result.data?.length) throw new Error('Video changed in another window. Reload before trying again.');
}

export async function retireVideos(db: any, eventId: string, userId: string, rows: any[], removeHosted: (uid: string) => Promise<void>) {
  for (const row of rows) {
    // Recheck the published reference; never delete a video now in use.
    const current = await readVideoConfig(db, eventId);
    if (current?.video_url === `https://iframe.cloudflarestream.com/${row.cloudflare_uid}`) continue;
    // Disable stale polling while keeping the identifier available for cleanup retries.
    const marked = await db.from('welcome_video_uploads').update({ status: 'error' })
      .eq('id', row.id).eq('event_id', eventId).eq('user_id', userId).select('id');
    if (marked.error) throw marked.error;
    if (!marked.data?.length) continue;
    await removeHosted(row.cloudflare_uid);
    const removed = await db.from('welcome_video_uploads').delete()
      .eq('id', row.id).eq('event_id', eventId).eq('user_id', userId);
    if (removed.error) throw removed.error;
  }
}

export async function removeWelcomeVideos(db: any, eventId: string, userId: string, removeHosted: (uid: string) => Promise<void>) {
  await requireVideoOwner(db, eventId, userId);
  const previous = await readVideoConfig(db, eventId);
  const uploads = await db.from('welcome_video_uploads').select('id,cloudflare_uid').eq('event_id', eventId).eq('user_id', userId);
  if (uploads.error) throw uploads.error;
  for (const row of uploads.data ?? []) {
    const marked = await db.from('welcome_video_uploads').update({ status: 'error' })
      .eq('id', row.id).eq('event_id', eventId).eq('user_id', userId);
    if (marked.error) throw marked.error;
  }
  // Unpublish before removal; failed remote deletion retains tracking rows for retry.
  // A unique marker also prevents an in-flight status response from publishing
  // against the same empty configuration after removal (an ABA race).
  const removedConfig = { removed_at: crypto.randomUUID() };
  await saveVideoConfig(db, eventId, previous, removedConfig);
  try {
    await retireVideos(db, eventId, userId, uploads.data ?? [], removeHosted);
  } catch (error) {
    // Keep the existing Remove control available for a retry, without replacing
    // a newer choice saved from another window. Remote DELETE is idempotent.
    try { await saveVideoConfig(db, eventId, removedConfig, previous); } catch { /* Preserve newer choice. */ }
    throw error;
  }
}

export async function checkWelcomeVideo(db: any, eventId: string, userId: string, streamUid: string, account: string, token: string, request = fetch) {
    await requireVideoOwner(db, eventId, userId);
    const uploads = await db.from('welcome_video_uploads').select('*').eq('event_id', eventId).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (uploads.error) throw uploads.error;
    const upload = uploads.data?.find((row: { cloudflare_uid: string; id: string; status: string }) => row.cloudflare_uid === streamUid);
    if (!upload) throw new Error('Video does not belong to this event');
    if (uploads.data[0].id !== upload.id || upload.status === 'error') {
      return { status: 'superseded' };
    }
    const previous = await readVideoConfig(db, eventId);
    if (!account || !token) throw new Error('Video service is unavailable');
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/${streamUid}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to check video status');
    const { result: video } = await response.json();
    const status = video.status?.state === 'ready' ? 'ready' : video.status?.state === 'error' ? 'error' : 'processing';
    const playbackUrl = status === 'ready' ? `https://iframe.cloudflarestream.com/${streamUid}` : null;
    // Postgres stores whole seconds; Cloudflare returns fractional seconds.
    const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
    const saved = await db.from('welcome_video_uploads').update({ status, cloudflare_playback_url: playbackUrl, duration_seconds: duration })
      .eq('id', upload.id).eq('event_id', eventId).eq('user_id', userId).eq('status', upload.status).select('id');
    if (saved.error) throw saved.error;
    if (!saved.data?.length) throw new Error('Video changed during processing; reload to check its status');
    let cleanupWarning: string | undefined;
    if (status === 'ready') {
      await saveVideoConfig(db, eventId, previous, { video_url: playbackUrl });
      try {
        await retireVideos(db, eventId, userId, uploads.data.filter((row: { id: string }) => row.id !== upload.id), uid => deleteStreamVideo(uid, account, token, request));
      } catch {
        cleanupWarning = 'New video saved, but the previous hosted upload could not be removed. Retry the status check to clean it up.';
      }
    }
    return { status, playback_url: playbackUrl, duration_seconds: duration, cleanup_warning: cleanupWarning };
}
