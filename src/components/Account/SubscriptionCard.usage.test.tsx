import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/ui/button', () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('./SectionCard', () => ({ SectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: { plan_name: 'Free', guest_limit: null }, isTrialExpired: false }) }));
vi.mock('@/hooks/useAccountBilling', () => ({ useAccountBilling: () => ({ data: null }) }));
vi.mock('@/hooks/useEventLimits', () => ({
  useEventLimits: () => ({
    loading: false,
    eventsError: 'Unable to load event usage.',
    additionalEventsError: null,
    guestsError: 'Unable to load guest usage.',
    includedEvents: 3,
    additionalPurchased: 0,
    remaining: 3,
    currentEvents: 0,
    totalGuests: 0,
  }),
}));
vi.mock('@/hooks/useAccountSeats', () => ({ useAccountSeats: () => ({ usedSeats: 1, maxSeats: 3 }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/permissions/MasterOnly', () => ({ MasterOnly: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const subscriptionQuery = {
  select: vi.fn(() => subscriptionQuery),
  eq: vi.fn(() => subscriptionQuery),
  limit: vi.fn(() => subscriptionQuery),
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
    from: vi.fn(() => subscriptionQuery),
  },
}));

import { CreditCard } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';

describe('SubscriptionCard usage states', () => {
  it('does not present failed event and guest totals as zero usage', () => {
    render(<SubscriptionCard icon={CreditCard} />);

    expect(screen.getByText('Events used').parentElement).toHaveTextContent('Unavailable');
    expect(screen.getByText('Guest allowance').parentElement).toHaveTextContent('Unavailable');
    expect(screen.getByText('Additional events purchased').parentElement).toHaveTextContent('0');
  });
});
