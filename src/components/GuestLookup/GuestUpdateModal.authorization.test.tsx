import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GuestUpdateModal } from './GuestUpdateModal';

const { rpc, toast } = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
const guest = { id: 'recipient', event_id: 'event', first_name: 'Test', last_name: 'Recipient', rsvp: 'Pending' };
const context = { guest: { ...guest, email: 'old@example.test', mobile: '0400000000', dietary: 'NA' }, can_edit: true, can_rsvp: true, can_add: false, allow_name_edit: false, relation_mode: 'off', custom_roles: [] };
const mount = (accessToken?: string) => render(<GuestUpdateModal guest={guest} event={{ id: 'event' }} open onOpenChange={() => {}} onUpdate={() => {}} accessToken={accessToken} />);
afterEach(cleanup);
beforeEach(() => { rpc.mockReset(); rpc.mockImplementation(async name => ({ data: name.startsWith('get_guest_details_form') ? context : true, error: null })); });

describe('guest details authorization', () => {
  it('loads private fields using the personal token and saves details without overwriting immediate RSVPs', async () => {
    mount('valid-personal-token');
    const email = await screen.findByLabelText('Email Address');
    expect(email).toHaveValue('old@example.test');
    expect(rpc).toHaveBeenCalledWith('get_guest_details_form_authorized', { _event_id: 'event', _guest_id: 'recipient', _access_token: 'valid-personal-token' });
    fireEvent.change(email, { target: { value: 'new@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save My Details' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('save_guest_details_form_authorized', expect.objectContaining({ _guest_id: 'recipient', _access_token: 'valid-personal-token', _details: expect.objectContaining({ email: 'new@example.test' }) })));
    const payload = rpc.mock.calls.find(call => call[0] === 'save_guest_details_form_authorized')[1]._details;
    for (const key of ['rsvp', 'family_group', 'seat_no', 'table_id', 'user_id']) expect(payload).not.toHaveProperty(key);
  });
  it('does not trust token presence when the server denies the token', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    mount('invalid-token');
    await screen.findByRole('alert');
    expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save My Details' })).not.toBeInTheDocument();
  });
  it('allows a verified manager to edit a selected guest whose RSVP is pending', async () => {
    rpc.mockResolvedValue({ data: { ...context, is_manager: true }, error: null });
    mount();
    await screen.findByLabelText('Email Address');
    expect(screen.getByRole('button', { name: 'Save My Details' })).toBeEnabled();
    expect(rpc).toHaveBeenCalledWith('get_guest_details_form', { _event_id: 'event', _guest_id: 'recipient' });
  });
});

