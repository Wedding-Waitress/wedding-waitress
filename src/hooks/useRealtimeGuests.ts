import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Guest } from '@/hooks/useGuests';

interface RealtimeGuestUpdate {
  guestId: string;
  sourceTableId: string | null;
  destTableId: string | null;
  destTableNo: number | null;
  guestName: string;
}

interface UseRealtimeGuestsReturn {
  guests: Guest[];
  loading: boolean;
  moveGuest: (update: RealtimeGuestUpdate) => Promise<boolean>;
  addGuest: (guest: Omit<Guest, 'id' | 'created_at'>) => Promise<boolean>;
  updateGuest: (guestId: string, updates: Partial<Guest>) => Promise<boolean>;
  deleteGuest: (guestId: string) => Promise<boolean>;
  refetchGuests: () => Promise<void>;
}

export const useRealtimeGuests = (eventId: string | null): UseRealtimeGuestsReturn => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch guests from database
  const fetchGuests = useCallback(async () => {
    if (!eventId) {
      setGuests([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching guests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch guests",
          variant: "destructive",
        });
        return;
      }

      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  // Debounced refetch as fallback
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      fetchGuests();
    }, 2000);
  }, [fetchGuests]);

  // Move guest with optimistic update and capacity validation
  const moveGuest = useCallback(async (update: RealtimeGuestUpdate): Promise<boolean> => {
    const { guestId, sourceTableId, destTableId, destTableNo, guestName } = update;
    
    // Find the guest to move
    const guestToMove = guests.find(g => g.id === guestId);
    if (!guestToMove) {
      toast({
        title: "Error",
        description: "Guest not found",
        variant: "destructive",
      });
      return false;
    }

    // Handle intra-table moves (reordering within same table)
    if (sourceTableId === destTableId && sourceTableId !== null) {
      // This is a reorder within the same table
      // We need to update display_order to maintain the new position
      
      // Get all guests in this table excluding the one being moved
      const tableGuests = guests.filter(g => 
        g.table_id === sourceTableId && g.id !== guestId
      );
      
      // Calculate new display_order based on position
      // For simplicity, we'll assign display_order as index * 10 to allow for future insertions
      const newDisplayOrder = tableGuests.length * 10 + 10;
      
      try {
        const { error } = await supabase
          .from('guests')
          .update({ display_order: newDisplayOrder })
          .eq('id', guestId);

        if (error) {
          console.error('Error reordering guest:', error);
          toast({
            title: "Error",
            description: "Failed to reorder guest",
            variant: "destructive",
          });
          return false;
        }

        toast({
          title: "Guest reordered",
          description: `${guestName} position updated`,
        });
        
        return true;
      } catch (error) {
        console.error('Error reordering guest:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        return false;
      }
    }

    // Handle inter-table moves (moving between different tables)
    if (sourceTableId === destTableId && sourceTableId === null) {
      // Both are null (unassigned), don't allow this move
      return false;
    }

    // Check if destination table exists and get capacity
    if (destTableId) {
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('limit_seats, name')
        .eq('id', destTableId)
        .single();

      if (tableError) {
        console.error('Error checking table capacity:', tableError);
        toast({
          title: "Error",
          description: "Failed to validate table capacity",
          variant: "destructive",
        });
        return false;
      }

      // Count current guests in destination table (excluding the one being moved)
      const currentGuestsInDest = guests.filter(g => 
        g.table_id === destTableId && g.id !== guestId
      ).length;

      if (currentGuestsInDest >= tableData.limit_seats) {
        toast({
          title: "Table is full",
          description: `${tableData.name} has reached its capacity of ${tableData.limit_seats} guests.`,
          variant: "destructive",
        });
        return false;
      }
    }

    // Handle seat number assignment for destination table
    let newSeatNo = guestToMove.seat_no;
    
    if (destTableId && guestToMove.seat_no) {
      // Check if seat number is already taken in destination table
      const destTableGuests = guests.filter(g => 
        g.table_id === destTableId && g.id !== guestId
      );
      
      const takenSeatNumbers = destTableGuests
        .map(g => g.seat_no)
        .filter(seatNo => seatNo !== null && seatNo !== undefined)
        .sort((a, b) => a - b);
      
      // If current seat number is taken, assign next available
      if (takenSeatNumbers.includes(guestToMove.seat_no)) {
        const maxSeatNo = Math.max(...takenSeatNumbers, 0);
        newSeatNo = maxSeatNo + 1;
        
        toast({
          title: "Seat number updated",
          description: `Seat ${guestToMove.seat_no} was taken. Assigned seat ${newSeatNo}`,
        });
      }
    }

    // Optimistic update
    const optimisticGuests = guests.map(g => 
      g.id === guestId 
        ? { ...g, table_id: destTableId, table_no: destTableNo, seat_no: newSeatNo }
        : g
    );
    setGuests(optimisticGuests);

    try {
      // Persist to database with display_order reset for new table
      const { error } = await supabase
        .from('guests')
        .update({
          table_id: destTableId,
          table_no: destTableNo,
          seat_no: newSeatNo,
          assigned: !!destTableId,
          display_order: null // Reset display_order when moving to new table
        })
        .eq('id', guestId);

      if (error) {
        console.error('Error moving guest:', error);
        // Revert optimistic update
        setGuests(guests);
        toast({
          title: "Error",
          description: "Failed to move guest",
          variant: "destructive",
        });
        return false;
      }

      // Success toast
      const tableName = destTableId 
        ? await supabase.from('tables').select('name').eq('id', destTableId).single().then(r => r.data?.name || 'Unknown Table')
        : 'Unassigned';
        
      toast({
        title: "Guest moved successfully",
        description: `Moved ${guestName} to ${tableName}`,
      });

      return true;
    } catch (error) {
      console.error('Error moving guest:', error);
      // Revert optimistic update
      setGuests(guests);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [guests, toast]);

  // Add guest
  const addGuest = useCallback(async (guestData: Omit<Guest, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Error",
          description: "You must be logged in to add guests",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('guests')
        .insert([{ ...guestData, user_id: user.user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error adding guest:', error);
        toast({
          title: "Error",
          description: "Failed to add guest",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Guest added successfully",
      });

      return true;
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Update guest
  const updateGuest = useCallback(async (guestId: string, updates: Partial<Guest>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId);

      if (error) {
        console.error('Error updating guest:', error);
        toast({
          title: "Error",
          description: "Failed to update guest",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Guest updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Delete guest
  const deleteGuest = useCallback(async (guestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) {
        console.error('Error deleting guest:', error);
        toast({
          title: "Error",
          description: "Failed to delete guest",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Guest deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Realtime update received:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setGuests(currentGuests => {
      switch (eventType) {
        case 'INSERT':
          // Add new guest if not already present
          if (newRecord && !currentGuests.some(g => g.id === newRecord.id)) {
            return [...currentGuests, newRecord];
          }
          return currentGuests;

        case 'UPDATE':
          // Update existing guest
          if (newRecord) {
            return currentGuests.map(g => 
              g.id === newRecord.id ? newRecord : g
            );
          }
          return currentGuests;

        case 'DELETE':
          // Remove deleted guest
          if (oldRecord) {
            return currentGuests.filter(g => g.id !== oldRecord.id);
          }
          return currentGuests;

        default:
          return currentGuests;
      }
    });
  }, []);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!eventId) {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create new channel for this event
    const channel = supabase
      .channel(`guests:event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to guests:event:${eventId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.error(`Realtime subscription ${status}, setting up debounced refetch`);
          debouncedRefetch();
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or eventId change
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [eventId, handleRealtimeUpdate, debouncedRefetch]);

  // Initial fetch when eventId changes
  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    guests,
    loading,
    moveGuest,
    addGuest,
    updateGuest,
    deleteGuest,
    refetchGuests: fetchGuests
  };
};