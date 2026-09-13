import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
export type PlaceCardFitSnapshot = { settings_id: string; image_url: string; image_type: 'full' | 'full_front' | 'full_back'; x: number; y: number; fit: 'cover' | 'contain' };
export type PlaceCardFitRecord = { user_id: string; event_id: string; revision: number; snapshot: PlaceCardFitSnapshot };
export function parsePlaceCardFitRecord(value: unknown, owner: string, event: string): PlaceCardFitRecord | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, any>, saved = row.snapshot;
  if (row.user_id !== owner || row.event_id !== event || !Number.isSafeInteger(row.revision) || row.revision < 1
    || !saved || typeof saved !== 'object' || Object.keys(saved).length !== 6 || typeof saved.settings_id !== 'string' || !saved.settings_id
    || typeof saved.image_url !== 'string' || !saved.image_url || !['full', 'full_front', 'full_back'].includes(saved.image_type)
    || !['cover', 'contain'].includes(saved.fit) || ![saved.x, saved.y].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100)) return null;
  return row as PlaceCardFitRecord;
}
export function makePlaceCardFitSnapshot(settings: PlaceCardSettings | null, fit: 'cover' | 'contain'): PlaceCardFitSnapshot | null {
  if (!settings?.id || !settings.user_id || !settings.event_id || !settings.background_image_url || !['full', 'full_front', 'full_back'].includes(settings.background_image_type)) return null;
  const x = settings.background_image_x_position ?? 50, y = settings.background_image_y_position ?? 50;
  if (![x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) return null;
  return { settings_id: settings.id, image_url: settings.background_image_url, image_type: settings.background_image_type as PlaceCardFitSnapshot['image_type'], x, y, fit };
}
export function readPlaceCardScopedFit(value: unknown, settings: PlaceCardSettings | null): 'cover' | 'contain' | null {
  if (!value || typeof value !== 'object' || !settings) return null;
  const row = parsePlaceCardFitRecord(value, settings.user_id, settings.event_id);
  if (!row) return null;
  const saved = row.snapshot, expected = makePlaceCardFitSnapshot(settings, 'cover');
  if (!expected || row.user_id !== settings.user_id || row.event_id !== settings.event_id || !Number.isSafeInteger(row.revision) || row.revision < 1
    || !saved || typeof saved !== 'object' || Object.keys(saved).length !== 6 || !['cover', 'contain'].includes(saved.fit)
    || Object.entries(expected).some(([key, value]) => key !== 'fit' && saved[key] !== value)) return null;
  return saved.fit;
}
