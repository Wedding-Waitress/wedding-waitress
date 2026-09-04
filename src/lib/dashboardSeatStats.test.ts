import { describe, expect, it } from 'vitest';
import { calculateDashboardSeatStats } from './dashboardSeatStats';

describe('calculateDashboardSeatStats', () => {
  it('reports remaining physical seats from created table capacity', () => {
    const tables = [
      { id: 'table-1', limit_seats: 52 },
      { id: 'table-2', limit_seats: 52 },
    ];

    expect(calculateDashboardSeatStats(tables, [])).toEqual({
      seatsCreated: 104,
      seatsFilled: 0,
      seatsRemaining: 104,
    });
  });

  it('counts assigned guests and ignores unassigned guests', () => {
    const tables = [{ id: 'table-1', limit_seats: 10 }];
    const guests = [
      { table_id: 'table-1' },
      { table_id: 'table-1' },
      { table_id: null },
    ];

    expect(calculateDashboardSeatStats(tables, guests)).toEqual({
      seatsCreated: 10,
      seatsFilled: 2,
      seatsRemaining: 8,
    });
  });

  it('uses the Head Table seating order instead of stale guest counts', () => {
    const tables = [{
      id: 'head-table',
      limit_seats: 4,
      table_purpose: 'head',
      head_seating_order: [{}, {}],
    }];
    const guests = Array.from({ length: 10 }, () => ({ table_id: 'head-table' }));

    expect(calculateDashboardSeatStats(tables, guests)).toEqual({
      seatsCreated: 4,
      seatsFilled: 2,
      seatsRemaining: 2,
    });
  });
});
