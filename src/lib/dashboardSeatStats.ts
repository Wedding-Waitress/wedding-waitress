interface SeatStatsTable {
  id: string;
  limit_seats: number;
  table_purpose?: string | null;
  head_seating_order?: unknown[] | null;
}

interface SeatStatsGuest {
  table_id?: string | null;
}

export function calculateDashboardSeatStats(
  tables: SeatStatsTable[],
  guests: SeatStatsGuest[],
) {
  const assignedGuestsByTable = guests.reduce<Map<string, number>>((counts, guest) => {
    if (guest.table_id) {
      counts.set(guest.table_id, (counts.get(guest.table_id) ?? 0) + 1);
    }
    return counts;
  }, new Map());

  const seatsCreated = tables.reduce((sum, table) => sum + table.limit_seats, 0);
  const seatsFilled = tables.reduce((sum, table) => {
    const occupied = table.table_purpose === 'head'
      ? table.head_seating_order?.length ?? 0
      : assignedGuestsByTable.get(table.id) ?? 0;
    return sum + Math.min(occupied, Math.max(table.limit_seats, 0));
  }, 0);

  return {
    seatsCreated,
    seatsFilled,
    seatsRemaining: Math.max(0, seatsCreated - seatsFilled),
  };
}
