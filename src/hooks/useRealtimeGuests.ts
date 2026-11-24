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
 * - Changes could break cross-view updates (dashboard/Live Slideshow/guest lookup)
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
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { isHeadTableMoveActive } from '@/lib/headTableMovePersistence';
import { isTableSeatingBusy, saveTableSeating } from '@/lib/tableSeatingPersistence';

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
registerCache(() => { guestsCache.clear(); });
registerEventCache((eventId) => { guestsCache.delete(eventId); });

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
  const currentEventRef = useRef(eventId); currentEventRef.current = eventId;
  const fetchVersionRef = useRef(0);

  // Keep cache in sync
  useEffect(() => {
    if (eventId && guests.length > 0) guestsCache.set(eventId, guests);
  }, [eventId, guests]);

  // Fetch guests from database
  const fetchGuests = useCallback(async () => {
    const version=++fetchVersionRef.current;
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

      if(currentEventRef.current!==eventId||version!==fetchVersionRef.current)return;
      guestsCache.set(eventId,data||[]);
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      if(currentEventRef.current===eventId&&version===fetchVersionRef.current)setLoading(false);
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

  // Save against fresh event data. The shared queue and checked recovery keep
  // rapid drags, reorders and missing-seat repairs from overlapping writes.
  const reorderGuestsWithSeats = useCallback(async (tableId:string,orderedGuestIds:string[]):Promise<boolean> => {
    if(!eventId||!tableId||!orderedGuestIds.length)return false;
    const isCurrent=()=>currentEventRef.current===eventId;
    isOperationInProgress.current=true;
    try{
      const changed=await saveTableSeating(eventId,{tableId,orderedGuestIds},isCurrent);
      if(changed&&isCurrent())toast({title:'Guests reordered',description:'Seat numbers updated successfully'});
      return changed;
    }catch(error){
      if(isCurrent())toast({title:'Unable to rearrange guests',description:error instanceof Error?error.message:(error as any)?.message||'The seating could not be saved. Refresh and try again.',variant:'destructive'});
      return false;
    }finally{isOperationInProgress.current=false;if(isCurrent())await fetchGuests();}
  },[eventId,fetchGuests,toast]);

  const moveGuest = useCallback(async (update:RealtimeGuestUpdate):Promise<boolean> => {
    if(!eventId)return false;
    const isCurrent=()=>currentEventRef.current===eventId;
    isOperationInProgress.current=true;
    try{
      const changed=await saveTableSeating(eventId,{guestId:update.guestId,sourceTableId:update.sourceTableId,destTableId:update.destTableId,insertAtIndex:update.insertAtIndex},isCurrent);
      if(changed&&isCurrent())toast({title:'Guest moved successfully',description:update.destTableId?'Table and seat assignments saved.':update.guestName+' is now unassigned.'});
      return changed;
    }catch(error){
      if(isCurrent())toast({title:'Unable to move guest',description:error instanceof Error?error.message:(error as any)?.message||'The move could not be saved. Refresh and try again.',variant:'destructive'});
      return false;
    }finally{isOperationInProgress.current=false;if(isCurrent())await fetchGuests();}
  },[eventId,fetchGuests,toast]);

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
    if (isOperationInProgress.current || (eventId && (isHeadTableMoveActive(eventId)||isTableSeatingBusy(eventId)))) {
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
  }, [debouncedRefetch, eventId]);

  // Set up Supabase Realtime subscription - stable, only re-runs on eventId change
  useEffect(() => {
    if (!eventId) {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create a channel for this event using the shared legacy channel name.
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
  }, [eventId]); // Stable deps - handleRealtimeUpdate and debouncedRefetch never change identity

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
