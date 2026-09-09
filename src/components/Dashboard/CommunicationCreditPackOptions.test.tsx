import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentProcessingProvider } from '@/contexts/PaymentProcessingContext';
import { CommunicationCreditPackOptions } from './CommunicationCreditPackOptions';

describe('CommunicationCreditPackOptions', () => {
  it('offers both shared Email and SMS packs together', () => {
    render(
      <PaymentProcessingProvider>
        <CommunicationCreditPackOptions eventId="event-1" />
      </PaymentProcessingProvider>,
    );
    expect(screen.getByText('Add shared Email & SMS credits:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy 10 shared Email and SMS credits for A$10' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Buy 100 shared Email and SMS credits for A$49' })).toBeEnabled();
  });

  it('does not expose checkout actions without an eligible plan', () => {
    render(
      <PaymentProcessingProvider>
        <CommunicationCreditPackOptions eventId="event-1" canPurchase={false} />
      </PaymentProcessingProvider>,
    );
    expect(screen.getByText(/require an active Essential, Premium or Ultimate plan/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
