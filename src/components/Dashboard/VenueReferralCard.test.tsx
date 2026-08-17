import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueReferralCard } from './VenueReferralCard';
import styles from './VenueReferralCard.module.css';

vi.mock('./InviteVenueModal', () => ({
  InviteVenueModal: ({ open }: { open: boolean }) => open ? <div data-testid="invite-venue-modal" /> : null,
}));

describe('VenueReferralCard', () => {
  it('uses the isolated glass panel and preserves invite and dismissal actions', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <VenueReferralCard
        event={{ id: 'event-1', name: 'Jason & Linda’s Wedding' }}
        onDismiss={onDismiss}
      />,
    );

    expect(container.firstElementChild).toHaveClass(styles.panel);
    expect(screen.getByText('Using a participating venue?')).toHaveClass(styles.heading);

    fireEvent.click(screen.getByRole('button', { name: 'Invite My Venue' }));
    expect(screen.getByTestId('invite-venue-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledWith('event-1', 14);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith('event-1', null);
  });
});
