import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { useTables } from './useTables';

describe('useTables request shape', () => {
  it('loads any number of table guest counts with exactly two parallel data requests', async () => {
    const tables = Array.from({ length: 12 }, (_, index) => ({
      id: `table-${index}`,
      event_id: 'event-fixed-requests',
      user_id: 'owner',
      name: `Table ${index}`,
      limit_seats: 10,
      table_no: index,
      table_type: 'round',
      table_purpose: 'standard',
      head_seating_order: [],
      created_at: '',
      updated_at: '',
    }));
    const guests = [
      { table_id: 'table-0' },
      { table_id: 'table-0' },
      { table_id: 'table-7' },
      { table_id: null },
    ];
    mocks.from.mockImplementation((table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(async () => ({
          data: table === 'tables' ? tables : guests,
          error: null,
        })),
      };
      return builder;
    });

    const { result } = renderHook(() => useTables('event-fixed-requests'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.tables).toHaveLength(12));

    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(result.current.tables.find((table) => table.id === 'table-0')?.guest_count).toBe(2);
    expect(result.current.tables.find((table) => table.id === 'table-7')?.guest_count).toBe(1);
  });
});
