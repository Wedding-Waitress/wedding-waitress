import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/ui/button', () => ({ Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('./SectionCard', () => ({ SectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
const planState = vi.hoisted(() => ({ owner: false, name: 'Free', guestLimit: null as number | null, usageError: true }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: { plan_name: planState.name, guest_limit: planState.guestLimit, expires_at: '2025-09-16T08:16:00Z' }, isTrialExpired: false, hasPlatformOwnerAccess: planState.owner }) }));
vi.mock('@/hooks/useAccountBilling', () => ({ useAccountBilling: () => ({ data: null }) }));
vi.mock('@/hooks/useEventLimits', () => ({
  useEventLimits: () => ({
    loading: false,
    eventsError: 'Unable to load event usage.',
    additionalEventsError: null,
    guestsError: planState.usageError ? 'Unable to load guest usage.' : null,
    includedEvents: 1,
    additionalPurchased: 0,
    remaining: 1,
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

describe('owner expiry presentation',()=>{
 it('does not present an old subscription expiry as the owner access expiry',()=>{
  planState.owner=true;try {render(<SubscriptionCard icon={CreditCard}/>);
   expect(screen.getByText('Expiry date').parentElement).toHaveTextContent('No expiry — platform owner access');
   expect(screen.getByText('Full Access')).toBeInTheDocument();
  }finally{planState.owner=false;}
 });
 it('retains the real recorded expiry for ordinary accounts',()=>{
  planState.owner=false;render(<SubscriptionCard icon={CreditCard}/>);
  expect(screen.getByText('Expiry date').parentElement).toHaveTextContent(new Date('2025-09-16T08:16:00Z').toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}));
  expect(screen.queryByText('No expiry — platform owner access')).not.toBeInTheDocument();
 });
});

it.each([['Essential',100,'Essential'],['Premium',200,'Premium'],['Unlimited',400,'Ultimate'],['Ultimate',400,'Ultimate']])('shows confirmed %s account plan with its stored allowance',(name,limit,display)=>{planState.name=name as string;planState.guestLimit=limit as number;planState.usageError=false;try{render(<SubscriptionCard icon={CreditCard}/>);expect(screen.getByText(display)).toBeInTheDocument();expect(screen.getByText('Guest allowance').parentElement).toHaveTextContent('0 / '+limit);}finally{planState.name='Free';planState.guestLimit=null;planState.usageError=true;}});
