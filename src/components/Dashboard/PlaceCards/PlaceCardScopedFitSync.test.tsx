import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
const mock = vi.hoisted(() => ({ save: vi.fn(), record: null as any }));
vi.mock('@/contexts/AuthenticatedSessionContext', () => ({ useAuthenticatedSession: () => ({ session: { user: { id: 'actor' } } }) }));
vi.mock('@/hooks/usePlaceCardScopedImageFit', () => ({ usePlaceCardScopedImageFit: () => ({ ...mock, verified: true, error: null, saving: false, reload: vi.fn() }) }));
import { PlaceCardScopedFitSync } from './PlaceCardScopedFitSync';
const settings = normalizePlaceCardSettings({ id: 'settings', background_image_url: '/actual.png', background_image_type: 'full_front' }, 'event', 'owner');
describe('interface-only explicit saved crop controls', () => {
  beforeEach(() => { mock.save.mockReset(); mock.record = null; });
  it('saves the visible choice only when requested', () => {
    render(<PlaceCardScopedFitSync ownerId="owner" eventId="event" settings={settings} visibleFit="contain" onUseSavedFit={vi.fn()}/>);
    expect(mock.save).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Save current crop for this event' })); expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ fit: 'contain', settings_id: 'settings', image_url: '/actual.png' }));
  });
  it('does not replace a visible crop merely because recorded history loads', () => {
    mock.record = { user_id: 'owner', event_id: 'event', revision: 1, snapshot: { settings_id: 'settings', image_url: '/actual.png', image_type: 'full_front', x: 50, y: 50, fit: 'cover' } };
    const onUse = vi.fn(); render(<PlaceCardScopedFitSync ownerId="owner" eventId="event" settings={settings} visibleFit="contain" onUseSavedFit={onUse}/>);
    expect(onUse).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Use saved crop for this artwork' })); expect(onUse).toHaveBeenCalledWith('cover');
  });
  it('does not offer to save another account’s artwork', () => {
    render(<PlaceCardScopedFitSync ownerId="foreign" eventId="event" settings={settings} visibleFit="cover" onUseSavedFit={vi.fn()}/>); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
