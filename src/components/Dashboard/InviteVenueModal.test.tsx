import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { InviteVenueModal } from './InviteVenueModal';
import styles from './InviteVenueModal.module.css';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  insert: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  invoke: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => table === 'events'
      ? { update: mocks.update }
      : { insert: mocks.insert }),
    auth: { getUser: mocks.getUser },
    functions: { invoke: mocks.invoke },
  },
}));

const event = {
  id: 'event-1',
  name: 'Wedding',
  venue: 'Grand Reception',
  venue_contact_email: 'coordinator@venue.com',
  venue_contact: 'Nader Elalfy',
  partner1_name: 'Alex',
  partner2_name: 'Sam',
};

describe('InviteVenueModal', () => {
  it('keeps the fields, live preview, validation and both close controls working', async () => {
    const onOpenChange = vi.fn();
    render(<InviteVenueModal open onOpenChange={onOpenChange} event={event} />);

    const modal = screen.getByTestId('invite-venue-modal');
    expect(modal).toHaveClass(styles.modal);
    expect(screen.getByPlaceholderText('coordinator@venue.com')).toHaveValue('coordinator@venue.com');
    expect(screen.getByPlaceholderText('e.g., Sarah')).toHaveValue('Nader Elalfy');
    expect(screen.getByText(/Hi Nader Elalfy,/)).toBeInTheDocument();

    const send = screen.getByRole('button', { name: 'Send Invitation' });
    fireEvent.change(screen.getByPlaceholderText('coordinator@venue.com'), { target: { value: 'invalid' } });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('coordinator@venue.com'), { target: { value: 'venue@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., Sarah'), { target: { value: 'Taylor' } });
    expect(send).toBeEnabled();
    expect(screen.getByText(/Hi Taylor,/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('preserves the invitation persistence and sending flow', async () => {
    const onOpenChange = vi.fn();
    render(<InviteVenueModal open onOpenChange={onOpenChange} event={event} />);

    fireEvent.change(screen.getByPlaceholderText('coordinator@venue.com'), { target: { value: 'new@venue.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('send-venue-invitation', {
      body: {
        event_id: 'event-1',
        venue_email: 'new@venue.com',
        venue_contact_name: 'Nader Elalfy',
      },
    }));
    expect(mocks.update).toHaveBeenCalledWith({ venue_contact_email: 'new@venue.com' });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      event_id: 'event-1',
      venue_email: 'new@venue.com',
      status: 'sent',
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('defines compact desktop, tablet and mobile overflow-safe layouts and interaction states', () => {
    const cssPath = resolve(process.cwd(), 'src/components/Dashboard/InviteVenueModal.module.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toMatch(/width:\s*min\(calc\(100vw - 2rem\), 31rem\)/);
    expect(css).toMatch(/max-height:\s*calc\(100dvh - 2rem\)/);
    expect(css).toMatch(/overflow-x:\s*hidden/);
    expect(css).toMatch(/@media \(max-width: 767px\)/);
    expect(css).toMatch(/@media \(max-width: 390px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/:active/);
    expect(css).toMatch(/:disabled/);
  });
});
