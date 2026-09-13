import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpSupportSection } from './AccountDestinations';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: { plan_name: 'Essential', guest_limit: 100 } }) }));
vi.mock('@/hooks/useEventLimits', () => ({ useEventLimits: () => ({ includedEvents: 1, additionalPurchased: 0, currentEvents: 1 }) }));
vi.mock('@/hooks/useAccountSeats', () => ({ useAccountSeats: () => ({ usedSeats: 1, maxSeats: 3 }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { first_name: 'Nader', last_name: 'Elalfy', email: 'nader@example.com' } }) }));
const query = {
  select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(() => query),
  maybeSingle: vi.fn(async () => ({ data: { id: 'event-1' } })),
  then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], count: 0 }).then(resolve),
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'nader@example.com' } } })) },
    from: vi.fn(() => query),
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

describe('Account Centre moved destinations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('submits support through the existing transactional-email function', async () => {
    mocks.invoke.mockResolvedValue({ error: null });
    render(<HelpSupportSection />);
    fireEvent.click(screen.getByRole('button', { name: 'General Help' }));
    fireEvent.change(screen.getByLabelText('How can we help?'), { target: { value: 'Please help with my account.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('send-transactional-email', expect.any(Object)));
  });
});
