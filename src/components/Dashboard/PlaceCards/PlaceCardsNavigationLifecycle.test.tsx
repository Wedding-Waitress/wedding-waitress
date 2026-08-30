import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pendingSettingsRequest = new Promise(() => undefined);

vi.mock('@/integrations/supabase/client', () => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(() => pendingSettingsRequest),
  };
  return { supabase: { from: vi.fn(() => query) } };
});

vi.mock('@/hooks/useRealtimeGuests', () => ({
  useRealtimeGuests: () => ({
    guests: [{ id: 'guest-1', first_name: 'First', last_name: 'Guest', assigned: true, table_id: 'table-1' }],
    loading: false,
  }),
}));

vi.mock('@/hooks/useTables', () => ({
  useTables: () => ({
    tables: [{ id: 'table-1', name: 'Table 1', table_no: 1, guest_count: 1, limit_seats: 10 }],
    loading: false,
  }),
}));

vi.mock('@/hooks/usePlaceCardPhotoVideoQr', () => ({
  usePlaceCardPhotoVideoQr: () => ({ data: null, loading: false, error: null }),
}));

vi.mock('./PlaceCardPreview', () => ({ PlaceCardPreview: () => <div>Place card preview</div> }));

import { PlaceCardsPage } from './PlaceCardsPage';

describe('Name Place Cards dashboard navigation lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('ww:place_cards_selected_table', 'table-1');
  });

  it.each([1440, 1024, 390])(
    'keeps the page stable at %ipx when cached data precedes settings',
    (viewportWidth) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewportWidth });
    render(
      <PlaceCardsPage
        selectedEventId="event-1"
        onEventSelect={vi.fn()}
        events={[{ id: 'event-1', name: 'First Visit Wedding' } as any]}
        eventsLoading={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Table Name Place Cards' })).toBeInTheDocument();
    expect(screen.queryByText('Place card preview')).not.toBeInTheDocument();
    },
  );

  it('handles leaving and reopening while the first request is still pending', () => {
    const page = render(
      <PlaceCardsPage
        selectedEventId="event-1"
        onEventSelect={vi.fn()}
        events={[{ id: 'event-1', name: 'First Visit Wedding' } as any]}
        eventsLoading={false}
      />,
    );

    page.rerender(
      <PlaceCardsPage selectedEventId={null} onEventSelect={vi.fn()} events={[]} eventsLoading={false} />,
    );
    expect(screen.getByText('No Events Found')).toBeInTheDocument();

    page.rerender(
      <PlaceCardsPage
        selectedEventId="event-2"
        onEventSelect={vi.fn()}
        events={[{ id: 'event-2', name: 'Reopened Wedding' } as any]}
        eventsLoading={false}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Table Name Place Cards' })).toBeInTheDocument();
  });
});
