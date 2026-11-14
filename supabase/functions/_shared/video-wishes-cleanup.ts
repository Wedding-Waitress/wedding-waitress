export const CLEANUP_AGE_MS = 2 * 60 * 60 * 1000;
export async function cleanVideoWish(job: any, deps: any, now = Date.now()) {
  if (!Number.isFinite(Date.parse(job.created_at)) || Date.parse(job.created_at) >= now - CLEANUP_AGE_MS) return false;
  const item = await deps.readItem(job.item_id);
  if (!item || item.source_category !== 'video_wishes' || item.event_id !== job.event_id) return false;
  if (!item.storage_path?.startsWith(job.event_id + '/')) return false;
  if (!['uploaded', 'pending', 'failed'].includes(item.upload_status)) return false;
  const incomplete = item.upload_status !== 'uploaded';
  // Atomically exclude an upload that completed since readItem. Finalisation also
  // requires pending status, so cleanup and successful saving cannot both win.
  if (incomplete && !await deps.claimIncomplete(item.id)) return false;
  if (job.processor_id) await deps.deleteProcessor(job.processor_id);
  if (incomplete) await deps.deleteFile(item.storage_path);
  await deps.completeJob(job.item_id);
  return true;
}
