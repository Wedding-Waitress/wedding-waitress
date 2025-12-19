/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Real-time Guest Sync Hook is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break real-time synchronization
 * - Changes could break optimistic updates
 * - Changes could break debounced refetch
 * - Changes could break cross-view updates (dashboard/kiosk/guest lookup)
 * - Changes could break guest move validation
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

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
  insertAtIndex?: number; // Optional: position to insert guest at in destination table
}

interface UseRealtimeGuestsReturn {
  guests: Guest[];
  loading: boolean;
  moveGuest: (update: RealtimeGuestUpdate) => Promise<boolean>;
  addGuest: (guest: Omit<Guest, 'id' | 'created_at'>) => Promise<boolean>;
  updateGuest: (guestId: string, updates: Partial<Guest>) => Promise<boolean>;
  deleteGuest: (guestId: string) => Promise<boolean>;
  refetchGuests: () => Promise<void>;
  reorderGuestsWithSeats: (tableId: string, orderedGuestIds: string[]) => Promise<boolean>;
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

  // Reorder guests within a table and recalculate seat numbers
  const reorderGuestsWithSeats = useCallback(async (
    tableId: string,
    orderedGuestIds: string[]
  ): Promise<boolean> => {
    if (!tableId || orderedGuestIds.length === 0) return false;

    // Store original guests for potential revert
    const originalGuests = [...guests];

    // Optimistic update - reorder locally and assign new seat numbers
    setGuests(currentGuests => {
      return currentGuests.map(g => {
        if (g.table_id !== tableId) return g;
        const newIndex = orderedGuestIds.indexOf(g.id);
        if (newIndex === -1) return g;
        return { ...g, seat_no: newIndex + 1 };
      });
    });

    try {
      // Phase 1: Clear all seat numbers for these guests to avoid unique constraint conflicts
      const { error: clearError } = await supabase
        .from('guests')
        .update({ seat_no: null })
        .in('id', orderedGuestIds);

      if (clearError) {
        console.error('Error clearing seat numbers:', clearError);
        setGuests(originalGuests);
        toast({
          title: "Error",
          description: "Failed to reorder guests",
          variant: "destructive",
        });
        return false;
      }

      // Phase 2: Assign new seat numbers in order (no conflicts since all seats are cleared)
      for (let i = 0; i < orderedGuestIds.length; i++) {
        const { error } = await supabase
          .from('guests')
          .update({ seat_no: i + 1 })
          .eq('id', orderedGuestIds[i]);

        if (error) {
          console.error('Error updating guest seat:', error);
          setGuests(originalGuests);
          toast({
            title: "Error",
            description: "Failed to reorder guests",
            variant: "destructive",
          });
          return false;
        }
      }

      toast({
        title: "Guests reordered",
        description: "Seat numbers updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error reordering guests:', error);
      // Revert optimistic update
      setGuests(originalGuests);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [guests, toast]);

  // Move guest with optimistic update and capacity validation
  const moveGuest = useCallback(async (update: RealtimeGuestUpdate): Promise<boolean> => {
    const { guestId, sourceTableId, destTableId, destTableNo, guestName, insertAtIndex } = update;
    
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

    // Handle intra-table moves (reordering within same table) - now handled by reorderGuestsWithSeats
    if (sourceTableId === destTableId && sourceTableId !== null) {
      // This case is now handled by reorderGuestsWithSeats function
      // But keep a fallback for simple reordering if needed
      const tableGuests = guests.filter(g => 
        g.table_id === sourceTableId && g.id !== guestId
      );
      
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
    let newSeatNo: number | null = guestToMove.seat_no;
    let guestsToShift: Guest[] = [];
    
    if (destTableId) {
      // Get guests in destination table sorted by seat number
      const destTableGuests = guests
        .filter(g => g.table_id === destTableId && g.id !== guestId)
        .sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
      
      if (insertAtIndex !== undefined && insertAtIndex <= destTableGuests.length) {
        // Insert at specific position - need to shift other guests
        newSeatNo = insertAtIndex + 1; // Seat numbers are 1-based
        
        // Identify guests that need their seat numbers shifted
        guestsToShift = destTableGuests.slice(insertAtIndex);
      } else {
        // Insert at end - next seat number after existing guests
        newSeatNo = destTableGuests.length + 1;
      }
    } else {
      // If moving to unassigned, clear seat number
      newSeatNo = null;
    }

    // Build optimistic state update
    let optimisticGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, table_id: destTableId, table_no: destTableNo, seat_no: newSeatNo };
      }
      // Shift seat numbers for guests after the insertion point
      const shiftIndex = guestsToShift.findIndex(sg => sg.id === g.id);
      if (shiftIndex !== -1 && newSeatNo !== null) {
        return { ...g, seat_no: newSeatNo + 1 + shiftIndex };
      }
      return g;
    });
    setGuests(optimisticGuests);

    try {
      // First, shift the seat numbers of guests that come after the insertion point
      if (guestsToShift.length > 0 && newSeatNo !== null) {
        // Shift in reverse order to avoid unique constraint violations
        // (each guest moves into a slot that's just been vacated)
        for (let i = guestsToShift.length - 1; i >= 0; i--) {
          const guestToShift = guestsToShift[i];
          const shiftedSeatNo = newSeatNo + 1 + i;
          await supabase
            .from('guests')
            .update({ seat_no: shiftedSeatNo })
            .eq('id', guestToShift.id);
        }
      }

      // Persist the moved guest to database
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

  // Add guest with optimistic update
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

      // Create optimistic guest with temporary ID
      const optimisticGuest: Guest = {
        ...guestData,
        id: `temp-${Date.now()}`,
        user_id: user.user.id,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setGuests(currentGuests => [...currentGuests, optimisticGuest]);

      const { data, error } = await supabase
        .from('guests')
        .insert([{ ...guestData, user_id: user.user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error adding guest:', error);
        // Revert optimistic update
        setGuests(currentGuests => currentGuests.filter(g => g.id !== optimisticGuest.id));
        toast({
          title: "Error",
          description: "Failed to add guest",
          variant: "destructive",
        });
        return false;
      }

      // Replace optimistic guest with real data
      setGuests(currentGuests => 
        currentGuests.map(g => g.id === optimisticGuest.id ? data : g)
      );

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

  // Update guest with optimistic update
  const updateGuest = useCallback(async (guestId: string, updates: Partial<Guest>): Promise<boolean> => {
    // Store original guest for potential revert
    const originalGuest = guests.find(g => g.id === guestId);
    if (!originalGuest) {
      toast({
        title: "Error",
        description: "Guest not found",
        variant: "destructive",
      });
      return false;
    }

    // Optimistic update
    setGuests(currentGuests => 
      currentGuests.map(g => g.id === guestId ? { ...g, ...updates } : g)
    );

    try {
      const { error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId);

      if (error) {
        console.error('Error updating guest:', error);
        // Revert optimistic update
        setGuests(currentGuests => 
          currentGuests.map(g => g.id === guestId ? originalGuest : g)
        );
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
      // Revert optimistic update
      setGuests(currentGuests => 
        currentGuests.map(g => g.id === guestId ? originalGuest : g)
      );
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [guests, toast]);

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

      // Optimistic update - remove guest from local state immediately
      setGuests(currentGuests => currentGuests.filter(g => g.id !== guestId));

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
    if (process.env.NODE_ENV === 'development') {
      console.log('Realtime update received:', payload);
    }
    
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

    // Create new channel for this event - using same channel name as GuestLookup and KioskView
    const channel = supabase
      .channel(`kiosk-guests:event:${eventId}`)
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
        console.log(`Dashboard realtime subscription status: ${status} for kiosk-guests:event:${eventId}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Dashboard successfully subscribed to kiosk-guests:event:${eventId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Dashboard realtime subscription error, setting up debounced refetch');
          debouncedRefetch();
        } else if (status === 'CLOSED') {
          console.error('❌ Dashboard realtime subscription closed, setting up debounced refetch');
          debouncedRefetch();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Dashboard realtime subscription timed out, setting up debounced refetch');
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

  // Clear guests immediately when eventId changes, then fetch
  useEffect(() => {
    // Reset guests to empty array when switching events to prevent showing stale data
    setGuests([]);
    fetchGuests();
  }, [eventId]); // Only depend on eventId to ensure fresh data

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
    refetchGuests: fetchGuests,
    reorderGuestsWithSeats
  };
};