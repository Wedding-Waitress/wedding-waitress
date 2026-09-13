import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { retiredLiveViewAsset } from './liveViewAssetCleanup';

export function usesEventHero(config: Record<string, any> | null | undefined) {
  return config?.source === 'event' || (!config?.source && !config?.file_url);
}

/** Publish a saved event's image, never a draft or a custom/hidden hero override. */
export async function syncEventHeroImage(eventId: string) {
  const eventResult = await supabase.from('events').select('id,user_id,event_image_path').eq('id', eventId).single();
  if (eventResult.error) throw eventResult.error;
  const event = eventResult.data;
  const result = await supabase.from('live_view_module_settings').select('*').eq('event_id', eventId).maybeSingle();
  if (result.error) throw result.error;
  const previous = result.data?.hero_image_config as Record<string, any> | null;
  if (!usesEventHero(previous)) return;
  const sourcePath = event.event_image_path;
  if (previous?.source_path === sourcePath && previous?.file_url) return;
  if (!sourcePath && !previous?.file_url) return;

  let publishedPath: string | null = null;
  let config: Record<string, any> = { source: 'event' };
  if (sourcePath) {
    if (!sourcePath.startsWith(`${event.user_id}/`)) throw new Error('Event image does not belong to this event owner');
    const download = await supabase.storage.from('event-branding').download(sourcePath);
    if (download.error) throw download.error;
    const extension = download.data.type === 'image/png' ? 'png' : download.data.type === 'image/webp' ? 'webp' : 'jpg';
    publishedPath = `${event.user_id}/${eventId}/hero_image/event-${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from('live-view-uploads').upload(publishedPath, download.data, { contentType: download.data.type });
    if (upload.error) throw upload.error;
    config = {
      source: 'event', source_path: sourcePath,
      file_url: supabase.storage.from('live-view-uploads').getPublicUrl(publishedPath).data.publicUrl,
      file_name: 'My Events photo or logo', file_type: download.data.type, uploaded_at: new Date().toISOString(),
    };
  }
  try {
    const latest = await supabase.from('events').select('event_image_path').eq('id', eventId).single();
    if (latest.error) throw latest.error;
    if (latest.data.event_image_path !== sourcePath) {
      if (publishedPath) await supabase.storage.from('live-view-uploads').remove([publishedPath]);
      return;
    }
    let saved;
    if (result.data) {
      let query = supabase.from('live_view_module_settings').update({ hero_image_config: config }).eq('id', result.data.id);
      query = previous === null ? query.is('hero_image_config', null) : query.eq('hero_image_config', JSON.stringify(previous));
      saved = await query.select('id');
    } else {
      saved = await supabase.from('live_view_module_settings').upsert({ event_id: eventId, hero_image_config: config }, { onConflict: 'event_id', ignoreDuplicates: true }).select('id');
    }
    if (saved.error) throw saved.error;
    if (!saved.data?.length) {
      if (publishedPath) await supabase.storage.from('live-view-uploads').remove([publishedPath]);
      return;
    }
  } catch (error) {
    if (publishedPath) await supabase.storage.from('live-view-uploads').remove([publishedPath]);
    throw error;
  }
  const otherUrls = Object.entries(result.data ?? {}).filter(([key]) => key !== 'hero_image_config')
    .map(([, value]) => value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>).file_url : undefined);
  const retired = retiredLiveViewAsset(previous?.file_url, config.file_url, otherUrls, eventId, SUPABASE_URL || '');
  if (retired) {
    const cleanup = await supabase.storage.from(retired.bucket).remove([retired.path]);
    if (cleanup.error) throw cleanup.error;
  }
}
