import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestListUtilityDrawer } from './GuestListUtilityDrawer';

vi.mock('./SmartSmsCreditStatus', () => ({
  SmartSmsCreditStatus: ({ eventId, recipientCount }: { eventId: string; recipientCount?: number }) => (
    <div>Credit details for {eventId}; recipients {recipientCount ?? 0}</div>
  ),
}));

describe('GuestListUtilityDrawer', () => {
  it('shows the selected event Email & SMS credit details and closes through the shared sheet control', () => {
    const onOpenChange = vi.fn();
    render(
      <GuestListUtilityDrawer
        eventId="event-42"
        kind="sms"
        open
        recipientCount={3}
        onOpenChange={onOpenChange}
        onConfigureGuestLiveView={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Email & SMS Credits' })).toBeInTheDocument();
    expect(screen.getByText('Credit details for event-42; recipients 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('supports the shared drawer Escape-key behaviour', () => {
    const onOpenChange = vi.fn();
    render(
      <GuestListUtilityDrawer
        eventId="event-42"
        kind="sms"
        open
        onOpenChange={onOpenChange}
        onConfigureGuestLiveView={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves the complete protection information and configuration action into its drawer', () => {
    const configure = vi.fn();
    render(
      <GuestListUtilityDrawer
        eventId="event-42"
        kind="guest-live-view"
        open
        onOpenChange={vi.fn()}
        onConfigureGuestLiveView={configure}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Guest Live View' })).toBeInTheDocument();
    expect(screen.getByText(/7 days before your event/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Configure Guest Live View/ }));
    expect(configure).toHaveBeenCalledTimes(1);
  });
});
