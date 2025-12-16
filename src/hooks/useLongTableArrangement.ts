import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Guest } from '@/hooks/useGuests';
import { toast } from 'sonner';

export type SeatSide = 'A' | 'B' | 'T' | 'E'; // A=Side A, B=Side B, T=Top end, E=End (bottom)

export interface SeatArrangement {
  id: string;
  event_id: string;
  table_id: string;
  guest_id: string;
  side: SeatSide;
  position: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ArrangedGuest {
  guest: Guest;
  side: SeatSide;
  position: number;
}

// Convert side and position to seat_no for syncing with guests table
// Side A: 1-20, Side B: 21-40, Top: 41, End: 42
const calculateSeatNo = (side: SeatSide, position: number): number => {
  switch (side) {
    case 'A':
      return position; // 1-20
    case 'B':
      return 20 + position; // 21-40
    case 'T':
      return 41; // Top end seat
    case 'E':
      return 42; // Bottom end seat
    default:
      return position;
  }
};

export const useLongTableArrangement = (eventId: string | null, tableId: string | null) => {
  const [arrangements, setArrangements] = useState<SeatArrangement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArrangements = useCallback(async () => {
    if (!tableId) {
      setArrangements([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('long_table_seat_arrangements')
        .select('*')
        .eq('table_id', tableId)
        .order('side', { ascending: true })
        .order('position', { ascending: true });

      if (error) throw error;
      setArrangements((data as SeatArrangement[]) || []);
    } catch (error) {
      console.error('Error fetching seat arrangements:', error);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchArrangements();
  }, [fetchArrangements]);

  // Get default balanced distribution for guests
  const getDefaultArrangement = useCallback((guests: Guest[]): ArrangedGuest[] => {
    const sortedGuests = [...guests].sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
    const arranged: ArrangedGuest[] = [];
    
    // Split guests evenly between Side A and Side B
    sortedGuests.forEach((guest, index) => {
      const side: SeatSide = index % 2 === 0 ? 'A' : 'B';
      const position = Math.floor(index / 2) + 1;
      arranged.push({ guest, side, position });
    });

    return arranged;
  }, []);

  // Apply custom arrangement to guests
  const getArrangedGuests = useCallback((guests: Guest[]): ArrangedGuest[] => {
    if (arrangements.length === 0) {
      return getDefaultArrangement(guests);
    }

    const arranged: ArrangedGuest[] = [];
    const arrangementMap = new Map(arrangements.map(a => [a.guest_id, a]));
    const assignedGuestIds = new Set(arrangements.map(a => a.guest_id));

    // First, add guests with custom arrangements
    arrangements.forEach(arr => {
      const guest = guests.find(g => g.id === arr.guest_id);
      if (guest) {
        arranged.push({
          guest,
          side: arr.side as SeatSide,
          position: arr.position
        });
      }
    });

    // Then, add any remaining guests using default distribution
    const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));
    const sideACounts = arrangements.filter(a => a.side === 'A').length;
    const sideBCounts = arrangements.filter(a => a.side === 'B').length;
    
    unassignedGuests.forEach((guest, index) => {
      // Balance the sides
      const side: SeatSide = (sideACounts + index) % 2 === 0 ? 'A' : 'B';
      const existingOnSide = arranged.filter(a => a.side === side);
      const position = existingOnSide.length + 1;
      arranged.push({ guest, side, position });
    });

    // Sort by side and position
    return arranged.sort((a, b) => {
      if (a.side !== b.side) {
        const sideOrder = { 'T': 0, 'A': 1, 'B': 2, 'E': 3 };
        return sideOrder[a.side] - sideOrder[b.side];
      }
      return a.position - b.position;
    });
  }, [arrangements, getDefaultArrangement]);

  // Save arrangements to database AND sync seat_no to guests table
  const saveArrangements = useCallback(async (newArrangements: ArrangedGuest[]) => {
    if (!tableId || !eventId) return false;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete existing arrangements for this table
      const { error: deleteError } = await supabase
        .from('long_table_seat_arrangements')
        .delete()
        .eq('table_id', tableId);

      if (deleteError) throw deleteError;

      // Insert new arrangements
      if (newArrangements.length > 0) {
        const insertData = newArrangements.map(arr => ({
          event_id: eventId,
          table_id: tableId,
          guest_id: arr.guest.id,
          side: arr.side,
          position: arr.position,
          user_id: user.id
        }));

        const { error: insertError } = await supabase
          .from('long_table_seat_arrangements')
          .insert(insertData);

        if (insertError) throw insertError;

        // CRITICAL: Also update seat_no in the guests table for sync
        // This ensures Tables page and Guest List page reflect the changes
        for (const arr of newArrangements) {
          const seatNo = calculateSeatNo(arr.side, arr.position);
          const { error: guestUpdateError } = await supabase
            .from('guests')
            .update({ seat_no: seatNo })
            .eq('id', arr.guest.id);

          if (guestUpdateError) {
            console.error('Error updating guest seat_no:', guestUpdateError);
          }
        }
      }

      await fetchArrangements();
      toast.success('Seat arrangement saved');
      return true;
    } catch (error) {
      console.error('Error saving arrangements:', error);
      toast.error('Failed to save seat arrangement');
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableId, eventId, fetchArrangements]);

  // Reset to default balanced distribution
  const resetToDefault = useCallback(async () => {
    if (!tableId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('long_table_seat_arrangements')
        .delete()
        .eq('table_id', tableId);

      if (error) throw error;

      setArrangements([]);
      toast.success('Reset to default arrangement');
      return true;
    } catch (error) {
      console.error('Error resetting arrangements:', error);
      toast.error('Failed to reset arrangement');
      return false;
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  return {
    arrangements,
    loading,
    getArrangedGuests,
    getDefaultArrangement,
    saveArrangements,
    resetToDefault,
    refetch: fetchArrangements
  };
};