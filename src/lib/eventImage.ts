import { supabase } from '@/integrations/supabase/client';
import {
  validateProfileImageFile,
  type ProfileImageMime,
  type ValidatedProfileImage,
} from '@/lib/profileImage';

export const EVENT_IMAGE_BUCKET = 'event-branding';
export const EVENT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export type EventImageFit = 'cover' | 'contain';

export interface EventImageValue {
  path: string;
  fit: EventImageFit;
  positionX: number;
  positionY: number;
  zoom: number;
}

export const EVENT_IMAGE_MIN_ZOOM = 100;
export const EVENT_IMAGE_MAX_ZOOM = 200;

export const clampEventImagePosition = (value: number) => Math.min(100, Math.max(0, value));
export const clampEventImageZoom = (value: number) => Math.min(EVENT_IMAGE_MAX_ZOOM, Math.max(EVENT_IMAGE_MIN_ZOOM, value));

export const eventImageCropTransform = (value: Pick<EventImageValue, 'fit' | 'positionX' | 'positionY' | 'zoom'>) => {
  if (value.fit !== 'cover') return undefined;
  const scale = clampEventImageZoom(value.zoom) / 100;
  const maximumTranslation = ((scale - 1) / (2 * scale)) * 100;
  const translateX = ((50 - clampEventImagePosition(value.positionX)) / 50) * maximumTranslation;
  const translateY = ((50 - clampEventImagePosition(value.positionY)) / 50) * maximumTranslation;
  return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
};

export type EventImageContext =
  | { kind: 'draft'; ownerId: string; draftId: string }
  | { kind: 'event'; ownerId: string; eventId: string };

const extensionForMime: Record<ProfileImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const randomId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const eventImageObjectPath = (context: EventImageContext, mime: ProfileImageMime) => {
  const scope = context.kind === 'draft' ? `drafts/${context.draftId}` : `events/${context.eventId}`;
  return `${context.ownerId}/${scope}/${randomId()}.${extensionForMime[mime]}`;
};

export const eventImageDirectory = (context: EventImageContext) => context.kind === 'draft'
  ? `${context.ownerId}/drafts/${context.draftId}`
  : `${context.ownerId}/events/${context.eventId}`;

export const validateEventImageFile = (file: File): Promise<ValidatedProfileImage> => validateProfileImageFile(file);

export const isEventImageBackendUnavailable = (error: unknown) => {
  const detail = typeof error === 'object' && error
    ? `${'message' in error ? String(error.message) : ''} ${'statusCode' in error ? String(error.statusCode) : ''}`
    : String(error ?? '');
  return /bucket not found|event-branding|event_image_|schema cache|does not exist|404/i.test(detail);
};

export const isEventImageZoomBackendUnavailable = (error: unknown) => {
  const detail = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error ?? '');
  return /event_image_zoom/i.test(detail) && /schema cache|does not exist|column/i.test(detail);
};

export const createEventImageSignedUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

export const probeEventImageStorage = async (context: EventImageContext) => {
  const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).list(eventImageDirectory(context), { limit: 1 });
  if (error) throw error;
};

export const removeEventImageIfUnreferenced = async (path: string) => {
  const { data, error } = await supabase.from('events').select('id').eq('event_image_path', path).limit(1);
  if (error || data?.length) return false;
  const { error: removeError } = await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([path]);
  return !removeError;
};
