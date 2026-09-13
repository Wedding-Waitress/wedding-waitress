import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPromotions } from './AdminPromotions';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
describe('owner promotional controls', () => {
  beforeEach(() => { invoke.mockReset(); sessionStorage.clear(); });
  it('uses manual codes and percentages, without fixed-dollar discounts or auto-generation', () => {
    render(<AdminPromotions />);
    expect(screen.getByLabelText('Promo code')).toHaveValue('');
    expect(screen.getByLabelText('Discount (%)')).toHaveAttribute('step', '1');
    expect(screen.queryByText(/generate random/i)).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });
  it('discloses the exact 50/51 threshold before creation', () => {
    render(<AdminPromotions />);
    expect(screen.getByText(/100 guests · 150 shared/)).toBeInTheDocument();
    expect(screen.getByText(/Normal package sending credits included/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Discount (%)'), { target: { value: '51' } });
    expect(screen.getByText(/Zero new included email\/SMS credits/)).toBeInTheDocument();
    expect(screen.getAllByText(/0 shared email\/SMS credits/)).toHaveLength(3);
  });
  it('always displays both credit rules as an accessible administrator reminder', () => {
    render(<AdminPromotions />);
    const reminder = screen.getByRole('complementary', { name: 'Email and SMS credit reminder' });
    expect(reminder).toHaveTextContent('1–50% off: Full package Email & SMS credits are included.');
    expect(reminder).toHaveTextContent('51–100% off: Zero new Email & SMS credits are included. Customers must purchase sending-credit top-ups.');
    expect(screen.getByLabelText('Discount (%)')).toHaveAttribute('aria-describedby', 'promotion-credit-reminder');
    fireEvent.change(screen.getByLabelText('Discount (%)'), { target: { value: '100' } });
    expect(reminder).toHaveTextContent('1–50% off:');
    expect(reminder).toHaveTextContent('51–100% off:');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('sends the owner verification and manually entered campaign, without any checkout call', async () => {
    sessionStorage.setItem('ww_admin_grant', 'fixture-grant'); sessionStorage.setItem('ww_admin_grant_sig', 'fixture-signature');
    invoke.mockResolvedValue({ data: { success: true, data: { id: 'fixture', code: 'VENUE50', campaign_name: 'Venue introduction', percent_off: 50, active: true } } });
    render(<AdminPromotions />);
    fireEvent.change(screen.getByLabelText('Campaign name'), { target: { value: 'Venue introduction' } });
    fireEvent.change(screen.getByLabelText('Promo code'), { target: { value: 'VENUE50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create promo code' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('admin-promotions', { body: expect.objectContaining({ action: 'create', code: 'VENUE50', percent_off: 50, admin_grant: 'fixture-grant', admin_grant_signature: 'fixture-signature' }) }));
    expect(await screen.findByRole('button', { name: 'Pause code' })).toBeInTheDocument();
  });
  it('reports backend unavailability instead of inventing a campaign', async () => {
    invoke.mockResolvedValue({ error: new Error('unavailable') }); render(<AdminPromotions />);
    fireEvent.click(screen.getByRole('button', { name: 'Load campaigns' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('button', { name: 'Pause code' })).not.toBeInTheDocument();
  });
});
