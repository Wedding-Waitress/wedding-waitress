import React from 'react';
import { render, screen } from '@testing-library/react';
import { History, Receipt } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { BillingCard } from './BillingCard';
import { HistoryCard } from './HistoryCard';

vi.mock('@/hooks/useAccountBilling', () => ({
  useAccountBilling: () => ({
    data: { paymentMethod: null, lastInvoice: null, nextBillingDate: null, history: [], portalUrl: null },
    loading: false,
    error: 'Edge Function unavailable',
  }),
}));
vi.mock('@/components/permissions/MasterOnly', () => ({ MasterOnly: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('Account billing error states', () => {
  it('does not misrepresent a billing request failure as empty billing data', () => {
    render(<BillingCard icon={Receipt} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Billing details are temporarily unavailable');
    expect(screen.queryByText('No payment method on file')).not.toBeInTheDocument();
  });

  it('does not misrepresent a history request failure as no transactions', () => {
    render(<HistoryCard icon={History} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invoice and payment history is temporarily unavailable');
    expect(screen.queryByText('No transactions yet.')).not.toBeInTheDocument();
  });
});
