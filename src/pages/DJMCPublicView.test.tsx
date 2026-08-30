import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DJMCPublicView } from './DJMCPublicView';
import { buildDJQuestionnaireUrl } from '@/lib/urlUtils';

const rpc = vi.fn();
const channel = { on: vi.fn(), subscribe: vi.fn() } as any;
channel.on.mockReturnValue(channel);
channel.subscribe.mockReturnValue(channel);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    channel: () => channel,
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/djMCQuestionnairePdfExporter', () => ({
  exportEntireQuestionnairePDF: vi.fn(),
  exportSectionPDF: vi.fn(),
}));

vi.mock('@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection', () => ({
  DJMCQuestionnaireSection: ({ disabled, onUpdateItem }: any) => (
    <section>
      <span>{disabled ? 'Public view only section' : 'Public editable section'}</span>
      <button disabled={disabled} onClick={() => onUpdateItem('item-1', { value_text: 'Saved edit' })}>Edit row</button>
    </section>
  ),
}));

const token = 'a'.repeat(43);
const row = (permission: 'view_only' | 'can_edit') => ({
  questionnaire_id: 'questionnaire-1', event_id: 'event-1', event_name: 'Fixture Wedding',
  event_date: '2027-01-30', event_venue: 'Fixture Venue', start_time: '18:00:00', finish_time: '23:00:00',
  ceremony_date: null, ceremony_venue: null, ceremony_start_time: null, ceremony_finish_time: null,
  permission,
  sections: [{ id: 'section-1', questionnaire_id: 'questionnaire-1', section_type: 'dance', section_label: 'Dance Music', order_index: 0, notes: null, is_collapsed: false, items: [{ id: 'item-1', section_id: 'section-1', row_label: 'Song 1', value_text: null, order_index: 0 }] }],
});

function renderRoute(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/dj-mc/:eventSlug/:token" element={<DJMCPublicView />} /><Route path="/dj-mc/:token" element={<DJMCPublicView />} /></Routes></MemoryRouter>);
}

describe('DJMCPublicView secure share flow', () => {
  beforeEach(() => { rpc.mockReset(); channel.on.mockClear(); channel.subscribe.mockClear(); });

  it('rejects a malformed token before querying the database', async () => {
    renderRoute('/dj-mc/malformed');
    expect(await screen.findByText('This share link is malformed.')).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('loads the intended questionnaire in view-only mode', async () => {
    rpc.mockResolvedValue({ data: [row('view_only')], error: null });
    const generatedPath = new URL(buildDJQuestionnaireUrl(token, 'fixture-wedding')).pathname;
    renderRoute(generatedPath);
    expect(await screen.findByRole('heading', { name: 'Fixture Wedding', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Public view only section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit row' })).toBeDisabled();
    expect(rpc).toHaveBeenCalledWith('get_dj_mc_questionnaire_by_token', { share_token: token });
  });

  it('persists permitted edits through the token-secured RPC', async () => {
    rpc.mockImplementation((name: string) => Promise.resolve(name === 'get_dj_mc_questionnaire_by_token'
      ? { data: [row('can_edit')], error: null }
      : { data: null, error: null }));
    renderRoute(`/dj-mc/fixture-wedding/${token}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit row' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('update_dj_mc_item_by_token', expect.objectContaining({ share_token: token, item_id: 'item-1', new_value_text: 'Saved edit' })), { timeout: 1200 });
  });

  it('keeps expired or revoked tokens unavailable when the secure lookup returns no rows', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderRoute(`/dj-mc/fixture-wedding/${token}`);
    expect(await screen.findByText('This link is invalid, expired, or revoked.')).toBeInTheDocument();
  });
});
