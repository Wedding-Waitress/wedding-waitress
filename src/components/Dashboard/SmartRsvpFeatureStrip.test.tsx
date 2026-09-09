import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmartRsvpFeatureStrip } from './SmartRsvpFeatureStrip';

describe('SmartRsvpFeatureStrip', () => {
  it('renders the six centres in order and keeps every action interactive', () => {
    const actions = Array.from({ length: 6 }, () => vi.fn());
    const { container } = render(
      <SmartRsvpFeatureStrip
        onCommandCentre={actions[0]}
        onCommunications={actions[1]}
        onDelivery={actions[2]}
        onIntelligence={actions[3]}
        onSmsCredits={actions[4]}
        onGuestLiveView={actions[5]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'RSVP Command CentreSend & manage invitations',
      'Communications CentreEmail & SMS history',
      'Delivery CentreTracking & resend',
      'Guest Intelligence CentreSmart RSVP analytics',
      'SMS CreditsBalance & top-ups',
      'Guest Live ViewPrivacy & visibility',
    ]);

    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(actions[index]).toHaveBeenCalledTimes(1);
    });

    expect(container.firstElementChild).toHaveClass(
      'grid-cols-1',
      'min-[420px]:grid-cols-2',
      'md:grid-cols-3',
      'xl:grid-cols-6',
    );
    buttons.forEach((button) => expect(button).toHaveClass('h-full', 'min-h-16'));
  });
});
