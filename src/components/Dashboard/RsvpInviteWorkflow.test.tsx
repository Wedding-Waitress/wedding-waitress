import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RsvpAlreadyPaidModal } from './RsvpAlreadyPaidModal';
import { SendRsvpConfirmModal } from './SendRsvpConfirmModal';
import { ManualInviteConfirmModal } from './ManualInviteConfirmModal';
import actionStyles from './RsvpInviteActions.module.css';

const nader = {
  id: 'guest-1', first_name: 'Nader', last_name: 'Elalfy',
  email: 'nader@example.com', mobile: null,
};

describe('RSVP invitation dialogs', () => {
  it.each([
    ['mobile', 375],
    ['tablet', 768],
    ['desktop', 1440],
  ])('keeps the delivery controls available at %s width', (_label, width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
    render(
      <RsvpAlreadyPaidModal
        isOpen
        onClose={vi.fn()}
        onContinue={vi.fn()}
        onEditGuest={vi.fn()}
        eventId="event-1"
        planName="Ultimate"
        included={450}
        used={0}
        remaining={450}
        selectedGuests={[nader]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Delivery method' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Email only/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(actionStyles.cancelAction);
  });

  it('explains missing contact details and disables unavailable delivery methods', () => {
    const onContinue = vi.fn();
    render(
      <RsvpAlreadyPaidModal
        isOpen
        onClose={vi.fn()}
        onContinue={onContinue}
        onEditGuest={vi.fn()}
        eventId="event-1"
        planName="Ultimate"
        included={450}
        used={0}
        remaining={450}
        selectedGuests={[nader]}
      />,
    );

    expect(screen.getByText('Nader will receive an email only because no mobile number is saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SMS only/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Email \+ SMS/i })).toBeDisabled();
    expect(screen.getByText('450 Email & SMS credits included with your plan.')).toBeInTheDocument();
    expect(screen.queryByText(/Combined Email & SMS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$100 AUD/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Email only/i }));
    expect(screen.getByText(/This send will use/)).toHaveTextContent('1 shared credit');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass(actionStyles.primaryAction);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledWith('email');
  });

  it('does not send before confirmation and suppresses duplicate confirmation clicks', async () => {
    let release!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    render(
      <SendRsvpConfirmModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        method="email"
        selectedGuests={[nader]}
        creditsRemaining={450}
        isSending={false}
      />,
    );

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Are you ready to send this RSVP invitation to Nader Elalfy?')).toBeInTheDocument();
    expect(screen.getByText('Credits remaining').nextElementSibling).toHaveTextContent('449');
    const confirm = screen.getByRole('button', { name: /Confirm & Send/i });
    expect(confirm).toHaveClass(actionStyles.primaryAction);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(actionStyles.cancelAction);
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    release();
  });

  it('requires confirmation before manually changing invite status', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ManualInviteConfirmModal isOpen guestCount={2} isUpdating={false} onClose={vi.fn()} onConfirm={onConfirm} />,
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Are you sure you want to mark these RSVP invitations for 2 guests as sent manually? Wedding Waitress will not send an email or SMS.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Mark as Sent' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
