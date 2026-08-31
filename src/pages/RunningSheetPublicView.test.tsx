import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunningSheetPublicView } from './RunningSheetPublicView';

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const removeChannel = vi.fn();
  const subscribe = vi.fn(() => ({}));
  const on = vi.fn(() => ({ on, subscribe }));
  const channel = vi.fn(() => ({ on, subscribe }));
  return { rpc, removeChannel, subscribe, on, channel };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ eventSlug: 'andy-and-cathy', token: 'public_token' }) };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc, channel: mocks.channel, removeChannel: mocks.removeChannel },
}));
vi.mock('@/lib/runningSheetPdfExporter', () => ({ exportRunningSheetPDF: vi.fn() }));
vi.mock('@/components/Dashboard/RunningSheet/RunningSheetSection', () => ({
  RunningSheetSection: ({ disabled }: { disabled?: boolean }) => (
    <section data-testid="public-run-sheet" data-disabled={String(!!disabled)}>Shared rows</section>
  ),
}));

const validRow = (permission: 'view_only' | 'can_edit') => ({
  sheet_id: 'sheet-1', event_id: 'event-1', event_name: 'Andy & Cathy',
  event_date: '2027-01-30', event_venue: 'Luxor Receptions', start_time: '18:00:00', finish_time: '23:00:00',
  ceremony_date: null, ceremony_venue: null, ceremony_start_time: null, ceremony_finish_time: null,
  permission, items: [], section_label: 'Run Sheet', section_notes: null,
});

describe('RunningSheetPublicView token retrieval', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['view_only', 'true'],
    ['can_edit', 'false'],
  ] as const)('retrieves an active %s token anonymously and enforces its permission', async (permission, disabled) => {
    mocks.rpc.mockResolvedValue({ data: [validRow(permission)], error: null });
    render(<RunningSheetPublicView />);

    await waitFor(() => expect(screen.getAllByText('Andy & Cathy')).toHaveLength(2));
    expect(mocks.rpc).toHaveBeenCalledWith('get_running_sheet_by_token', { share_token: 'public_token' });
    expect(screen.getByTestId('public-run-sheet')).toHaveAttribute('data-disabled', disabled);
    expect(screen.getByText(permission === 'can_edit' ? 'Can Edit' : 'View Only')).toBeVisible();
  });

  it.each(['expired', 'revoked', 'malformed'])('keeps an unavailable state for a %s token', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    render(<RunningSheetPublicView />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Link Unavailable' })).toBeVisible());
    expect(screen.getByText('This link is invalid or has expired')).toBeVisible();
    expect(screen.queryByTestId('public-run-sheet')).not.toBeInTheDocument();
  });
});
