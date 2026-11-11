import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  guests: Array.from({ length: 13 }, (_, i) => ({
    id: `guest-${i}`, first_name: `Guest ${i}`, last_name: 'Example', email: null, mobile: null,
    rsvp: i < 4 ? 'Attending' : 'Pending', rsvp_date: i < 4 ? '2026-10-02T00:00:00Z' : null,
    rsvp_invite_status: i === 0 ? 'both_sent' : 'not_sent',
    rsvp_invite_sent_at: i === 0 ? '2026-10-01T00:00:00Z' : null,
  })),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  rpc: async () => ({ data: [{ total: 450, used: 6, remaining: 444 }] }),
  from: (table: string) => {
    const result = { data: table === 'guests' ? fixtures.guests : [], error: null };
    const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
    for (const method of ['select', 'eq', 'order', 'limit']) chain[method] = () => chain;
    chain.maybeSingle = async () => ({ data: null, error: null });
    return chain;
  },
} }));
vi.mock('@/hooks/useSmsCredits', () => ({ useSmsCredits: () => ({ credits: { total: 450, used: 6, remaining: 444 } }) }));
vi.mock('@/components/Dashboard/SmartSmsCreditStatus', () => ({
  SmartSmsCreditStatus: () => null,
  getCreditHealth: () => ({ state: 'healthy', message: 'Healthy', toneClasses: '', iconColor: '' }),
}));

import { SmartRsvpAnalyticsPanel } from './SmartRsvpAnalyticsPanel';
afterEach(cleanup);

describe('messaging analytics rendered cohorts', () => {
  it('renders one invitation and 100% invited response, while retaining the overall 31% RSVP rate', async () => {
    render(<SmartRsvpAnalyticsPanel eventId="event" open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Invited Response Rate').parentElement).toHaveTextContent('100%'));
    await waitFor(() => expect(screen.getByText('Invitations sent').parentElement).toHaveTextContent(/^Invitations sent1$/));
    expect(screen.getByText('Overall RSVP rate').parentElement).toHaveTextContent('31%');
    expect(screen.queryByText('400%')).not.toBeInTheDocument();
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search communication history' })).toBeInTheDocument();
  });
});
