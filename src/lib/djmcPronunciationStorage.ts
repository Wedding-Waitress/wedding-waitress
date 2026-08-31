import { supabase } from '@/integrations/supabase/client';

export const DJMC_PRONUNCIATION_BUCKET = 'djmc-pronunciations';
export const DJMC_PRONUNCIATION_SIGNED_URL_TTL_SECONDS = 15 * 60;

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const PATH_RE = new RegExp(`^(${UUID_PATTERN})/(${UUID_PATTERN})/(${UUID_PATTERN})/(${UUID_PATTERN})\\.(webm|ogg|mp4|m4a)$`, 'i');
const LEGACY_PUBLIC_URL_RE = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/venue-logos\/pronunciations\/[A-Za-z0-9._-]+$/;

export type DJMCPronunciationAccess = {
  eventId: string;
  itemId: string;
  shareToken?: string;
};

export function isDJMCPronunciationPath(path: string): boolean {
  return PATH_RE.test(path);
}

export function isLegacyDJMCPronunciationUrl(value: string): boolean {
  return LEGACY_PUBLIC_URL_RE.test(value);
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  return 'webm';
}

async function invokeSharedMedia(
  action: 'sign' | 'upload' | 'delete',
  access: DJMCPronunciationAccess,
  options: { path?: string; blob?: Blob } = {},
) {
  const form = new FormData();
  form.set('action', action);
  form.set('eventId', access.eventId);
  form.set('itemId', access.itemId);
  form.set('shareToken', access.shareToken || '');
  if (options.path) form.set('path', options.path);
  if (options.blob) form.set('file', options.blob, `pronunciation.${extensionForMimeType(options.blob.type)}`);

  const { data, error } = await supabase.functions.invoke('djmc-pronunciation-media', { body: form });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { path?: string; signedUrl?: string };
}

export async function createDJMCPronunciationSignedUrl(
  path: string,
  access: DJMCPronunciationAccess,
): Promise<string> {
  if (!isDJMCPronunciationPath(path)) throw new Error('Invalid pronunciation recording path');

  if (access.shareToken) {
    const data = await invokeSharedMedia('sign', access, { path });
    if (!data.signedUrl) throw new Error('Could not create recording link');
    return data.signedUrl;
  }

  const { data, error } = await supabase.storage
    .from(DJMC_PRONUNCIATION_BUCKET)
    .createSignedUrl(path, DJMC_PRONUNCIATION_SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Could not create recording link');
  return data.signedUrl;
}

export async function uploadDJMCPronunciation(
  blob: Blob,
  access: DJMCPronunciationAccess,
): Promise<string> {
  const data = await invokeSharedMedia('upload', access, { blob });
  if (!data.path || !isDJMCPronunciationPath(data.path)) throw new Error('Invalid recording path returned');
  return data.path;
}

export async function deleteDJMCPronunciation(
  path: string,
  access: DJMCPronunciationAccess,
): Promise<void> {
  if (!isDJMCPronunciationPath(path) && !isLegacyDJMCPronunciationUrl(path)) {
    throw new Error('Invalid pronunciation recording path');
  }
  await invokeSharedMedia('delete', access, { path });
}
