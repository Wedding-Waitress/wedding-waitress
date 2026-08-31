import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exportCeremonyPreviewToPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({
    loading: false,
    events: [{
      id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20',
      ceremony_date: '2026-12-20', venue: 'Sheldon Receptions',
    }],
  }),
}));

vi.mock('@/hooks/useCeremonyFloorPlan', () => ({
  useCeremonyFloorPlan: () => ({
    floorPlan: {
      chairs_per_row: 6, total_rows: 12, assigned_rows: 12,
      bridal_party_count_left: 10, bridal_party_count_right: 10,
    },
    loading: false,
    initialLoadComplete: true,
    createFloorPlan: vi.fn(), updateFloorPlan: vi.fn(), updateSeatAssignment: vi.fn(),
    updateBridalPartyMember: vi.fn(), updateBridalPartyRole: vi.fn(),
  }),
}));

vi.mock('./CeremonyFloorPlan/CeremonyFloorPlanA4', () => ({
  CeremonyFloorPlanA4Preview: ({ pageRef }: { pageRef: React.RefObject<HTMLDivElement> }) => (
    <div data-testid="ceremony-presentation-wrapper">
      <div
        ref={pageRef}
        data-testid="authoritative-ceremony-a4"
        data-ceremony-a4-renderer="true"
        data-print-mirror-document="ceremony-floor-plan"
      />
    </div>
  ),
}));

vi.mock('./CeremonyFloorPlan/CeremonyFloorPlanSettings', () => ({
  CeremonyFloorPlanSettings: () => <div data-testid="ceremony-settings" />,
}));
vi.mock('./ReceptionFloorPlan/ReceptionFloorPlanPage', () => ({ ReceptionFloorPlanPage: () => null }));
vi.mock('@/lib/ceremonyFloorPlanPdfExporter', () => ({
  exportCeremonyPreviewToPdf: mocks.exportCeremonyPreviewToPdf,
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { FloorPlanPage } from './FloorPlanPage';

describe('Ceremony A4 live export connection', () => {
  afterEach(() => vi.clearAllMocks());

  it('passes the one visible authoritative A4 node from the green button directly to PDF export', async () => {
    render(<FloorPlanPage selectedEventId="event-1" onEventSelect={vi.fn()} events={[{ id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20', ceremony_date: '2026-12-20', venue: 'Sheldon Receptions' } as any]} eventsLoading={false} />);
    const authoritativeA4 = screen.getByTestId('authoritative-ceremony-a4');

    expect(screen.getAllByTestId('authoritative-ceremony-a4')).toHaveLength(1);
    expect(screen.queryByTestId('hidden-ceremony-export')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download floor plan PDF' }));

    await waitFor(() => expect(mocks.exportCeremonyPreviewToPdf).toHaveBeenCalledTimes(1));
    expect(mocks.exportCeremonyPreviewToPdf).toHaveBeenCalledWith(expect.objectContaining({
      pageElement: authoritativeA4,
      eventName: "Jason & Linda's Wedding",
      eventDate: '2026-12-20',
    }));
  });

  it('marks that same referenced A4 node as the browser Print source', () => {
    render(<FloorPlanPage selectedEventId="event-1" onEventSelect={vi.fn()} events={[{ id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20', ceremony_date: '2026-12-20', venue: 'Sheldon Receptions' } as any]} eventsLoading={false} />);
    const authoritativeA4 = screen.getByTestId('authoritative-ceremony-a4');

    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(authoritativeA4).toHaveAttribute('data-ceremony-print-source', 'true');

    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(authoritativeA4).not.toHaveAttribute('data-ceremony-print-source');
  });
});
