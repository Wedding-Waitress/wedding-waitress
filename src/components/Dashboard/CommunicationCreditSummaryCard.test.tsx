import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CommunicationCreditSummaryCard,
  getCommunicationCreditLevel,
  normalizeCommunicationCredits,
} from './CommunicationCreditSummaryCard';
import { PaymentProcessingProvider } from '@/contexts/PaymentProcessingContext';

describe('CommunicationCreditSummaryCard', () => {
  it('shows one pooled allowance with used and remaining values', () => {
    render(
      <CommunicationCreditSummaryCard
        planName="Essential"
        planIncludedCredits={150}
        credits={{ total: 150, used: 50, remaining: 100 }}
      />,
    );

    expect(screen.getByText('Essential Plan')).toBeInTheDocument();
    expect(screen.getByText('remaining out of 150')).toBeInTheDocument();
    expect(screen.getByText('One shared balance for Email and SMS.')).toBeInTheDocument();
    expect(screen.getAllByText('100')).toHaveLength(2);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('includes purchased top-ups in the total without splitting Email and SMS', () => {
    render(
      <CommunicationCreditSummaryCard
        planName="Premium"
        planIncludedCredits={250}
        credits={{ total: 350, used: 25, remaining: 325 }}
      />,
    );

    expect(screen.getByText(/Includes \+100 purchased credits/)).toBeInTheDocument();
    expect(screen.getByText('remaining out of 350')).toBeInTheDocument();
  });

  it('normalizes transiently inconsistent values into a possible balance', () => {
    expect(normalizeCommunicationCredits({ total: 150, used: 50, remaining: 500 })).toEqual({
      total: 150,
      used: 50,
      remaining: 100,
    });
  });

  it('uses the plan allowance as a floor while preserving canonical usage', () => {
    expect(normalizeCommunicationCredits({ total: 1, used: 1, remaining: 0 }, 450)).toEqual({
      total: 450,
      used: 1,
      remaining: 449,
    });
  });

  it('changes state exactly at the absolute 50-credit threshold', () => {
    expect(getCommunicationCreditLevel({ total: 150, used: 99, remaining: 51 })).toBe('healthy');
    expect(getCommunicationCreditLevel({ total: 150, used: 100, remaining: 50 })).toBe('low');
    expect(getCommunicationCreditLevel({ total: 150, used: 149, remaining: 1 })).toBe('low');
    expect(getCommunicationCreditLevel({ total: 150, used: 150, remaining: 0 })).toBe('depleted');
    expect(getCommunicationCreditLevel({ total: 0, used: 0, remaining: 0 })).toBe('unknown');
    expect(getCommunicationCreditLevel({ total: 250, used: 100, remaining: 150 })).toBe('healthy');
  });

  it('reports loading and error states honestly', () => {
    const { rerender } = render(
      <CommunicationCreditSummaryCard planName="Ultimate" credits={{ total: 0, used: 0, remaining: 0 }} loading />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading shared credit balance');

    rerender(
      <CommunicationCreditSummaryCard
        planName="Ultimate"
        credits={{ total: 0, used: 0, remaining: 0 }}
        error="Email & SMS credit balance is temporarily unavailable."
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('temporarily unavailable');
  });

  it('renders the compact third-channel treatment with all shared values', () => {
    render(
      <CommunicationCreditSummaryCard
        planName="Essential"
        planIncludedCredits={150}
        credits={{ total: 150, used: 50, remaining: 100 }}
        variant="channel"
      />,
    );

    expect(screen.getByText('Essential Plan · Shared Credits')).toBeInTheDocument();
    expect(screen.getByText('Total 150 · Used 50 · Remaining 100')).toBeInTheDocument();
    expect(screen.getByLabelText('Shared Email and SMS credit summary')).toHaveAttribute('data-credit-level', 'healthy');
  });

  it('shows accessible low and depleted warnings without relying on colour', () => {
    const { rerender } = render(
      <CommunicationCreditSummaryCard
        planName="Essential"
        planIncludedCredits={150}
        credits={{ total: 150, used: 100, remaining: 50 }}
        variant="channel"
      />,
    );
    expect(screen.getByText('Credits running low')).toBeInTheDocument();
    expect(screen.getByLabelText('Shared Email and SMS credit summary')).toHaveAttribute('data-credit-level', 'low');

    rerender(
      <CommunicationCreditSummaryCard
        planName="Essential"
        planIncludedCredits={150}
        credits={{ total: 250, used: 100, remaining: 150 }}
        variant="channel"
      />,
    );
    expect(screen.queryByText('Credits running low')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Shared Email and SMS credit summary')).toHaveAttribute('data-credit-level', 'healthy');

    rerender(
      <CommunicationCreditSummaryCard
        planName="Essential"
        planIncludedCredits={150}
        credits={{ total: 150, used: 150, remaining: 0 }}
        variant="channel"
      />,
    );
    expect(screen.getByText('No credits remaining')).toBeInTheDocument();
    expect(screen.getByLabelText('Shared Email and SMS credit summary')).toHaveAttribute('data-credit-level', 'depleted');
  });

  it('shows both pooled purchase alternatives inside an exhausted channel card', () => {
    render(
      <PaymentProcessingProvider>
        <CommunicationCreditSummaryCard
          planName="Essential"
          planIncludedCredits={150}
          credits={{ total: 150, used: 150, remaining: 0 }}
          variant="channel"
          eventId="event-1"
        />
      </PaymentProcessingProvider>,
    );

    expect(screen.getByLabelText('Buy 10 shared Email and SMS credits for A$10')).toBeInTheDocument();
    expect(screen.getByLabelText('Buy 100 shared Email and SMS credits for A$49')).toBeInTheDocument();
  });
});
