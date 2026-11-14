import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: api.rpc,
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() } }));
vi.mock('@/components/Dashboard/DJMCQuestionnaire/GuestSongRequestsSection', () => ({
  GuestSongRequestsView: ({ rows, disabled, updateStatus, loading }: any) => <div>
    <span>{loading ? 'loading' : rows.map((r: any) => r.song_title).join(',')}</span>
    <button disabled={disabled} onClick={() => updateStatus('request-1', 'approved')}>Approve</button>
  </div>,
}));
import { DJMCSharedGuestRequests } from './DJMCSharedGuestRequests';
const props = { token: 'a'.repeat(43), eventId: 'event-1', eventName: 'Wedding', eventDate: null };
beforeEach(() => { api.rpc.mockReset(); });
describe('shared guest requests permissions and refresh', () => {
  it('uses token-scoped reads and keeps view-only controls disabled', async () => {
    api.rpc.mockResolvedValue({ data: { settings: { enabled: true }, rows: [{ song_title: 'Saved song' }] }, error: null });
    render(<DJMCSharedGuestRequests {...props} canEdit={false} />);
    expect(await screen.findByText('Saved song')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(api.rpc).toHaveBeenCalledWith('get_dj_mc_guest_requests_by_token', { share_token: props.token });
  });
  it('saves permitted request updates through the token endpoint', async () => {
    api.rpc.mockImplementation(async (name: string) => ({ data: name.startsWith('get_') ? { rows: [], settings: { enabled: true } } : true, error: null }));
    render(<DJMCSharedGuestRequests {...props} canEdit />);
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith('update_dj_mc_guest_request_by_token', {
      share_token: props.token, request_id: 'request-1', new_status: 'approved', remove_request: false,
    }));
  });
  it('provides retry on an unavailable secure endpoint', async () => {
    api.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    render(<DJMCSharedGuestRequests {...props} canEdit />);
    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    api.rpc.mockResolvedValue({ data: { rows: [{ song_title: 'Recovered' }] }, error: null });
    fireEvent.click(retry); expect(await screen.findByText('Recovered')).toBeInTheDocument();
  });
});

