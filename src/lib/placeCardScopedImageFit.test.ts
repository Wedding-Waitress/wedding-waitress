import { describe, expect, it } from 'vitest';
import { normalizePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { makePlaceCardFitSnapshot, readPlaceCardScopedFit } from './placeCardScopedImageFit';
const settings = normalizePlaceCardSettings({ id: 'settings', background_image_url: '/actual.png', background_image_type: 'full_front', background_image_x_position: 23, background_image_y_position: 80 }, 'event', 'owner');
const snapshot = { user_id: 'owner', event_id: 'event', revision: 1, snapshot: makePlaceCardFitSnapshot(settings, 'cover') };
describe('exact scoped explicit Place Card fit', () => {
  it.each(['cover', 'contain'] as const)('uses the exact recorded %s decision', fit => expect(readPlaceCardScopedFit({ ...snapshot, snapshot: makePlaceCardFitSnapshot(settings, fit) }, settings)).toBe(fit));
  it.each([{ ...snapshot, user_id: 'foreign' }, { ...snapshot, event_id: 'foreign' }, { ...snapshot, revision: 0 }, { ...snapshot, snapshot: { ...snapshot.snapshot, x: 50 } }, { ...snapshot, snapshot: { ...snapshot.snapshot, image_url: '/old.png' } }, { ...snapshot, snapshot: { ...snapshot.snapshot, fit: 'invented' } }])('does not borrow or normalize old history (%j)', value => expect(readPlaceCardScopedFit(value, settings)).toBeNull());
  it('does not manufacture a saved record or import unscoped browser history', () => {
    localStorage.setItem('ww:place-card-image-fit:event|/actual.png|full_front|23|80', 'cover');
    expect(readPlaceCardScopedFit(null, settings)).toBeNull(); expect(makePlaceCardFitSnapshot({ ...settings, id: undefined }, 'cover')).toBeNull(); localStorage.clear();
  });
});
