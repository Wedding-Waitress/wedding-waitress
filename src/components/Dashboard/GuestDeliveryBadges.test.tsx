import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuestDeliveryBadges } from './GuestDeliveryBadges';

afterEach(cleanup);

describe('GuestDeliveryBadges response priority', () => {
  it.each(['Attending', 'Not Attending'])('shows only Responded for a genuine %s response with no platform send', (rsvp) => {
    render(<GuestDeliveryBadges inviteStatus="not_sent" rsvp={rsvp} rsvpDate="2026-09-08" />);
    expect(screen.getByText('Responded')).toBeInTheDocument();
    expect(screen.queryByText('Not Sent')).not.toBeInTheDocument();
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
  });

  it('suppresses compact delivery badges after response without changing their source values', () => {
    const history = { inviteStatus: 'both_sent', rsvp: 'Attending', rsvpDate: '2026-09-08' };
    render(<GuestDeliveryBadges {...history} purchaseDeliveryMethod="both" lowCredits />);
    expect(screen.getByText('Responded')).toBeInTheDocument();
    expect(screen.queryByText('E+S')).not.toBeInTheDocument();
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Credits')).not.toBeInTheDocument();
    expect(history).toEqual({ inviteStatus: 'both_sent', rsvp: 'Attending', rsvpDate: '2026-09-08' });
  });

  it('retains delivery state for a pending, nonresponded guest', () => {
    render(<GuestDeliveryBadges inviteStatus="email_sent" rsvp="Pending" rsvpDate={null} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Responded')).not.toBeInTheDocument();
  });

  it('does not treat a preassigned attendance value without a response date as a response', () => {
    render(<GuestDeliveryBadges inviteStatus="email_sent" rsvp="Attending" rsvpDate={null} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Responded')).not.toBeInTheDocument();
  });
});
