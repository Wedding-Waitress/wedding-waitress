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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Module-level cache for instant loading on tab switches
const guestsCache = new Map<string, Guest[]>();

export const useRealtimeGuests = (eventId: string | null): UseRealtimeGuestsReturn => {
  const cached = eventId ? guestsCache.get(eventId) : undefined;
  const [guests, setGuests] = useState<Guest[]>(cached ?? []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Flag to prevent realtime updates from interfering with active drag operations
  const isOperationInProgress = useRef(false);
  // Stable ref for fetch function to avoid subscription churn
  const fetchGuestsRef = useRef<() => Promise<void>>(async () => {});

  // Keep cache in sync
  useEffect(() => {
    if (eventId && guests.length > 0) guestsCache.set(eventId, guests);
  }, [eventId, guests]);

  // Fetch guests from database
  const fetchGuests = useCallback(async () => {
    if (!eventId) {
      setGuests([]);
      return;
    }

    if (!guestsCache.has(eventId)) setLoading(true);
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

  // Keep ref in sync so subscription callback always calls latest fetch
  useEffect(() => {
    fetchGuestsRef.current = fetchGuests;
  }, [fetchGuests]);

  // Stable debounced refetch that uses ref - never changes identity
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      fetchGuestsRef.current();
    }, 1000);
  }, []);

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

    // Set operation flag to prevent realtime conflicts
    isOperationInProgress.current = true;

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
    } finally {
      // Always release the operation lock
      isOperationInProgress.current = false;
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
    let newSeatNo: number | null = null;
    let guestsToShift: Guest[] = [];
    
    if (destTableId) {
      // Get guests in destination table sorted by seat number
      const destTableGuests = guests
        .filter(g => g.table_id === destTableId && g.id !== guestId)
        .sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));
      
      if (destTableGuests.length === 0) {
        // Empty table - seat 1
        newSeatNo = 1;
        guestsToShift = [];
      } else if (insertAtIndex !== undefined && insertAtIndex < destTableGuests.length) {
        // Insert at specific position - get the seat number of the guest we're inserting BEFORE
        const guestAtPosition = destTableGuests[insertAtIndex];
        newSeatNo = guestAtPosition.seat_no || insertAtIndex + 1;
        
        // Shift ALL guests whose seat_no >= newSeatNo (not just array slice)
        guestsToShift = destTableGuests.filter(g => 
          g.seat_no !== null && g.seat_no >= newSeatNo!
        );
      } else {
        // Insert at end - next seat number after the last guest
        const lastGuest = destTableGuests[destTableGuests.length - 1];
        newSeatNo = (lastGuest?.seat_no || destTableGuests.length) + 1;
        guestsToShift = [];
      }
    } else {
      // If moving to unassigned, clear seat number
      newSeatNo = null;
    }

    // Build optimistic state update - shift each guest's seat by +1
    let optimisticGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, table_id: destTableId, table_no: destTableNo, seat_no: newSeatNo };
      }
      // Shift seat numbers: each shifted guest gets their original seat + 1
      if (guestsToShift.some(sg => sg.id === g.id)) {
        return { ...g, seat_no: (g.seat_no || 0) + 1 };
      }
      return g;
    });
    setGuests(optimisticGuests);

    // Set operation flag to prevent realtime conflicts
    isOperationInProgress.current = true;

    try {
      // Phase 0: Clear the moving guest's seat number first (safety for same-table edge cases)
      if (guestToMove.seat_no !== null) {
        await supabase
          .from('guests')
          .update({ seat_no: null })
          .eq('id', guestId);
      }

      // Phase 1: Clear seat numbers for guests that need to shift (avoids unique constraint violations)
      if (guestsToShift.length > 0) {
        const { error: clearError } = await supabase
          .from('guests')
          .update({ seat_no: null })
          .in('id', guestsToShift.map(g => g.id));
        
        if (clearError) {
          console.error('Error clearing seat numbers:', clearError);
          throw clearError;
        }
      }

      // Phase 2: Insert the moved guest with correct seat number
      const { error } = await supabase
        .from('guests')
        .update({
          table_id: destTableId,
          table_no: destTableNo,
          seat_no: newSeatNo,
          assigned: !!destTableId,
          display_order: null
        })
        .eq('id', guestId);

      if (error) {
        console.error('Error moving guest:', error);
        setGuests(guests);
        toast({
          title: "Error",
          description: "Failed to move guest",
          variant: "destructive",
        });
        return false;
      }

      // Phase 3: Re-assign shifted guests - each gets their original seat_no + 1
      if (guestsToShift.length > 0) {
        for (const shiftGuest of guestsToShift) {
          const newShiftedSeat = (shiftGuest.seat_no || 0) + 1;
          await supabase
            .from('guests')
            .update({ seat_no: newShiftedSeat })
            .eq('id', shiftGuest.id);
        }
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
      setGuests(guests);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      // Always release the operation lock
      isOperationInProgress.current = false;
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

  // Handle realtime updates - stable callback with no changing deps
  const handleRealtimeUpdate = useCallback((payload: any) => {
    // Skip realtime updates during active operations to prevent conflicts
    if (isOperationInProgress.current) {
      console.log('Skipping realtime update - operation in progress');
      return;
    }
    
    console.log('📡 Realtime update received:', payload.eventType, payload.new?.id || payload.old?.id);
    
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

    // Safety-net: schedule a debounced full refetch to catch any missed updates
    debouncedRefetch();
  }, [debouncedRefetch]);

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