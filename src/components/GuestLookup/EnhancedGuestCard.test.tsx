import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EnhancedGuestCard } from './EnhancedGuestCard';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

it('uses the public seating resolver for a legacy table assignment and keeps invited party separate from +1s', async () => {
  rpc.mockResolvedValue({ data: [{ table_name: '1. Brides Family' }], error: null });
  const nada = { id: 'nada', event_id: 'event', first_name: 'Nada', last_name: 'Elalfy', table_id: 'table-1', table_no: null, seat_no: 1, rsvp: 'Pending', dietary: 'Halal' };
  render(<EnhancedGuestCard guest={nada} partyMembers={[nada, { ...nada, id: 'hala', first_name: 'Hala' }]} additionalGuestCount={0} onUpdate={vi.fn()} />);
  await waitFor(() => expect(screen.getByText('Table 1 – Brides Family')).toBeInTheDocument());
  expect(screen.getByText('Seat 1')).toBeInTheDocument();
  expect(screen.getByText('Halal')).toBeInTheDocument();
  expect(screen.getByText('Your family / party')).toBeInTheDocument();
  expect(screen.getByText('Additional +1 guests')).toBeInTheDocument();
  expect(screen.getByText('None added')).toBeInTheDocument();
  expect(rpc).toHaveBeenCalledWith('get_public_table_data', { p_table_id: 'table-1', p_event_id: 'event' });
});
