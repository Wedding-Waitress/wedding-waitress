import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanBillingSection } from './PlanBillingSection';

const role = vi.hoisted(() => ({ isMaster: false }));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isMaster: role.isMaster, loading: false }) }));
vi.mock('./SubscriptionCard', () => ({ SubscriptionCard: () => <section>Current plan summary</section> }));
vi.mock('./BillingCard', () => ({ BillingCard: () => <section>Private billing details</section> }));
vi.mock('./HistoryCard', () => ({ HistoryCard: () => <section>Private invoice history</section> }));

describe('PlanBillingSection account-role boundary', () => {
  it('keeps payment details and invoice history hidden from standard team members', () => {
    role.isMaster = false;
    render(<PlanBillingSection />);
    expect(screen.getByText('Current plan summary')).toBeInTheDocument();
    expect(screen.queryByText('Private billing details')).not.toBeInTheDocument();
    expect(screen.queryByText('Private invoice history')).not.toBeInTheDocument();
  });

  it('shows payment details and invoice history to the master account holder', () => {
    role.isMaster = true;
    render(<PlanBillingSection />);
    expect(screen.getByText('Private billing details')).toBeInTheDocument();
    expect(screen.getByText('Private invoice history')).toBeInTheDocument();
  });
});
