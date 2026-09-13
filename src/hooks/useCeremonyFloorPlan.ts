/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * 
 * This file is part of the Ceremony Floor Plan feature which has been
 * finalized and locked for production use as of 2025-12-21.
 * 
 * ANY MODIFICATIONS require explicit written approval from the project owner.
 * 
 * See CEREMONY_FLOOR_PLAN_SPECS.md for complete technical specifications.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';

export interface SeatAssignment {
  side: 'left' | 'right';
  row: number;
  seat: number;
  name: string;
}

export interface CeremonyFloorPlan {
  id: string;
  event_id: string;
  user_id: string;
  chairs_per_row: number;
  total_rows: number;
  assigned_rows: number;
  left_side_label: string;
  right_side_label: string;
  altar_label: string;
  seat_assignments: SeatAssignment[];
  show_row_numbers: boolean;
  show_seat_numbers: boolean;
  bridal_party_left: string[];
  bridal_party_right: string[];
  bridal_party_count_left: number;
  bridal_party_count_right: number;
  bridal_party_roles_left: string[];
  bridal_party_roles_right: string[];
  couple_side_arrangement: 'groom_left' | 'bride_left';
  person_left_name: string;
  person_right_name: string;
  created_at: string;
  updated_at: string;
}

// Helper to get default role based on position and side
// The person closest to the couple gets the special role (Best Man/Maid of Honor)
// - On the LEFT side: the LAST index (closest to couple)
// - On the RIGHT side: the FIRST index (closest to couple)
export const getDefaultBridalRole = (
  side: 'left' | 'right',
  index: number,
  arrangement: 'groom_left' | 'bride_left',
  totalCount: number
): string => {
  const isGroomsSide = (arrangement === 'groom_left' && side === 'left') || 
                       (arrangement === 'bride_left' && side === 'right');
  
  // The person closest to the couple is:
  // - On the LEFT side: the LAST index (totalCount - 1)
  // - On the RIGHT side: the FIRST index (0)
  const isClosestToCouple = side === 'left' 
    ? index === totalCount - 1
    : index === 0;
  
  if (isGroomsSide) {
    if (isClosestToCouple) return 'Best Man';
    return 'Groomsman';
  } else {
    if (isClosestToCouple) return 'Maid of Honor';
    return 'Bridesmaid';
  }
};

const defaultFloorPlan: Omit<CeremonyFloorPlan, 'id' | 'event_id' | 'user_id' | 'created_at' | 'updated_at'> = {
  chairs_per_row: 5,
  total_rows: 10,
  assigned_rows: 3,
  left_side_label: "Groom's Family",
  right_side_label: "Bride's Family",
  altar_label: "Altar",
  seat_assignments: [],
  show_row_numbers: true,
  show_seat_numbers: true,
  bridal_party_left: [],
  bridal_party_right: [],
  bridal_party_count_left: 3,
  bridal_party_count_right: 3,
  bridal_party_roles_left: [],
  bridal_party_roles_right: [],
  couple_side_arrangement: 'groom_left',
  person_left_name: 'Groom',
  person_right_name: 'Bride',
};

// Module-level cache for instant loading on tab switches
const floorPlanCache = new Map<string, CeremonyFloorPlan>();
registerCache(() => { floorPlanCache.clear(); });
registerEventCache((eventId) => { floorPlanCache.delete(eventId); });

export const useCeremonyFloorPlan = (eventId: string | null) => {
  const cached = eventId ? floorPlanCache.get(eventId) : undefined;
  const [floorPlan, setFloorPlan] = useState<CeremonyFloorPlan | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached); // Start as true only if no cache
  const [initialLoadComplete, setInitialLoadComplete] = useState(!!cached);
  const { toast } = useToast();

  const activeEvent = useRef(eventId);
  activeEvent.current = eventId;
  const currentPlan = useRef(floorPlan);
  currentPlan.current = floorPlan?.event_id === eventId ? floorPlan : null;
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSaves = useRef(new Map<string, { confirmed: CeremonyFloorPlan; patches: Partial<CeremonyFloorPlan>[] }>());
  const fetchVersion = useRef(0);
  const editVersion = useRef(0);
  const creatingEvents = useRef(new Set<string>());

  // Keep cache in sync
  useEffect(() => {
    if (eventId && floorPlan?.event_id === eventId) floorPlanCache.set(eventId, floorPlan);
  }, [eventId, floorPlan]);

  const fetchFloorPlan = useCallback(async () => {
    const request = ++fetchVersion.current;
    const edits = editVersion.current;
    let loaded = false;
    if (!eventId) {
      setFloorPlan(null);
      setLoading(false);
      setInitialLoadComplete(false);
      return;
    }

    setFloorPlan(floorPlanCache.get(eventId) ?? null);
    setInitialLoadComplete(false);
    if (!floorPlanCache.has(eventId)) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceremony_floor_plans')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      loaded = true;
      if (activeEvent.current !== eventId || request !== fetchVersion.current || edits !== editVersion.current) return;

      if (data) {
        // Parse seat_assignments from Json to SeatAssignment[]
        const seatAssignments = Array.isArray(data.seat_assignments) 
          ? (data.seat_assignments as unknown as SeatAssignment[])
          : [];
        
        // Parse bridal party arrays
        const bridalPartyLeft = Array.isArray(data.bridal_party_left)
          ? (data.bridal_party_left as unknown as string[])
          : [];
        const bridalPartyRight = Array.isArray(data.bridal_party_right)
          ? (data.bridal_party_right as unknown as string[])
          : [];
        
        // Parse bridal party roles arrays
        const bridalPartyRolesLeft = Array.isArray(data.bridal_party_roles_left)
          ? (data.bridal_party_roles_left as unknown as string[])
          : [];
        const bridalPartyRolesRight = Array.isArray(data.bridal_party_roles_right)
          ? (data.bridal_party_roles_right as unknown as string[])
          : [];
        
        setFloorPlan({
          ...data,
          seat_assignments: seatAssignments,
          bridal_party_left: bridalPartyLeft,
          bridal_party_right: bridalPartyRight,
          bridal_party_roles_left: bridalPartyRolesLeft,
          bridal_party_roles_right: bridalPartyRolesRight,
          bridal_party_count_left: data.bridal_party_count_left ?? 3,
          bridal_party_count_right: data.bridal_party_count_right ?? 3,
          couple_side_arrangement: (data.couple_side_arrangement as 'groom_left' | 'bride_left') ?? 'groom_left',
          person_left_name: data.person_left_name ?? 'Groom',
          person_right_name: data.person_right_name ?? 'Bride',
        });
      } else {
        setFloorPlan(null);
      }
    } catch (error) {
      console.error('Error fetching ceremony floor plan:', error);
    } finally {
      if (activeEvent.current === eventId && request === fetchVersion.current) {
        setLoading(false);
        setInitialLoadComplete(loaded);
      }
    }
  }, [eventId]);

  const createFloorPlan = useCallback(async () => {
    if (!eventId || creatingEvents.current.has(eventId)) return null;
    creatingEvents.current.add(eventId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use upsert with ignoreDuplicates to prevent race condition errors
      const { data, error } = await supabase
        .from('ceremony_floor_plans')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          ...defaultFloorPlan,
          seat_assignments: [] as unknown as Json,
          bridal_party_left: [] as unknown as Json,
          bridal_party_right: [] as unknown as Json,
        }, {
          onConflict: 'event_id',
          ignoreDuplicates: true,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      
      // If upsert was ignored (already exists), fetch existing
      if (!data) {
        await fetchFloorPlan();
        return floorPlan;
      }

      const newPlan: CeremonyFloorPlan = {
        ...data,
        seat_assignments: [],
        bridal_party_left: [],
        bridal_party_right: [],
        bridal_party_roles_left: [],
        bridal_party_roles_right: [],
        bridal_party_count_left: data.bridal_party_count_left ?? 3,
        bridal_party_count_right: data.bridal_party_count_right ?? 3,
        couple_side_arrangement: (data.couple_side_arrangement as 'groom_left' | 'bride_left') ?? 'groom_left',
        person_left_name: data.person_left_name ?? 'Groom',
        person_right_name: data.person_right_name ?? 'Bride',
      };

      floorPlanCache.set(eventId, newPlan);
      if (activeEvent.current === eventId) setFloorPlan(newPlan);
      return newPlan;
    } catch (error: any) {
      console.error('Error creating ceremony floor plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create floor plan',
        variant: 'destructive',
      });
      return null;
    } finally { creatingEvents.current.delete(eventId); }
  }, [eventId, toast, fetchFloorPlan, floorPlan]);

  const updateFloorPlan = useCallback((updates: Partial<Omit<CeremonyFloorPlan, 'id' | 'event_id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const before = currentPlan.current;
    if (!before || before.event_id !== eventId) return Promise.resolve(false);
    editVersion.current++;
    let pending = pendingSaves.current.get(before.id);
    if (!pending) {
      pending = { confirmed: before, patches: [] };
      pendingSaves.current.set(before.id, pending);
    }
    const batch = pending;
    batch.patches.push(updates);
    const publish = () => {
      const next = batch.patches.reduce<CeremonyFloorPlan>((plan, patch) => ({ ...plan, ...patch }), batch.confirmed);
      floorPlanCache.set(before.event_id, next);
      if (activeEvent.current === before.event_id) {
        currentPlan.current = next;
        setFloorPlan(next);
      }
    };
    publish();
    const task = saveQueue.current.then(async () => {
      try {
        const { data, error } = await supabase.from('ceremony_floor_plans')
          .update(updates as unknown as Record<string, Json>)
          .eq('id', before.id).eq('event_id', before.event_id).select('id').single();
        if (error || !data) throw error || new Error('The floor plan could not be saved');
        batch.confirmed = { ...batch.confirmed, ...updates };
        return true;
      } catch (error) {
        toast({ title: 'Changes not saved', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
        return false;
      } finally {
        batch.patches.splice(batch.patches.indexOf(updates), 1);
        publish();
        if (!batch.patches.length) pendingSaves.current.delete(before.id);
      }
    });
    saveQueue.current = task;
    return task;
  }, [eventId, toast]);

  const updateSeatAssignment = useCallback(async (
    side: 'left' | 'right',
    row: number,
    seat: number,
    name: string
  ) => {
    if (!floorPlan) return false;

    const existingAssignments = currentPlan.current?.seat_assignments || [];
    
    // Find existing assignment for this seat
    const existingIndex = existingAssignments.findIndex(
      a => a.side === side && a.row === row && a.seat === seat
    );

    let newAssignments: SeatAssignment[];

    if (name.trim() === '') {
      // Remove assignment if name is empty
      newAssignments = existingAssignments.filter(
        a => !(a.side === side && a.row === row && a.seat === seat)
      );
    } else if (existingIndex >= 0) {
      // Update existing assignment
      newAssignments = [...existingAssignments];
      newAssignments[existingIndex] = { side, row, seat, name: name.trim() };
    } else {
      // Add new assignment
      newAssignments = [...existingAssignments, { side, row, seat, name: name.trim() }];
    }

    return await updateFloorPlan({ seat_assignments: newAssignments });
  }, [floorPlan, updateFloorPlan]);

  const updateBridalPartyMember = useCallback(async (
    side: 'left' | 'right',
    index: number,
    name: string
  ) => {
    if (!floorPlan) return false;

    const key = side === 'left' ? 'bridal_party_left' : 'bridal_party_right';
    const currentArray = [...(currentPlan.current?.[key] || [])];
    
    // Ensure array is large enough
    while (currentArray.length <= index) {
      currentArray.push('');
    }
    
    currentArray[index] = name;
    
    return await updateFloorPlan({ [key]: currentArray });
  }, [floorPlan, updateFloorPlan]);

  const getSeatName = useCallback((side: 'left' | 'right', row: number, seat: number): string => {
    if (!floorPlan) return '';
    const assignment = floorPlan.seat_assignments?.find(
      a => a.side === side && a.row === row && a.seat === seat
    );
    return assignment?.name || '';
  }, [floorPlan]);

  const getBridalPartyName = useCallback((side: 'left' | 'right', index: number): string => {
    if (!floorPlan) return '';
    const key = side === 'left' ? 'bridal_party_left' : 'bridal_party_right';
    return floorPlan[key]?.[index] || '';
  }, [floorPlan]);

  const updateBridalPartyRole = useCallback(async (
    side: 'left' | 'right',
    index: number,
    role: string
  ) => {
    if (!floorPlan) return false;

    const key = side === 'left' ? 'bridal_party_roles_left' : 'bridal_party_roles_right';
    const currentArray = [...(currentPlan.current?.[key] || [])];
    
    // Ensure array is large enough
    while (currentArray.length <= index) {
      currentArray.push('');
    }
    
    currentArray[index] = role;
    
    return await updateFloorPlan({ [key]: currentArray });
  }, [floorPlan, updateFloorPlan]);

  const getBridalPartyRole = useCallback((side: 'left' | 'right', index: number): string => {
    if (!floorPlan) return '';
    const key = side === 'left' ? 'bridal_party_roles_left' : 'bridal_party_roles_right';
    const countKey = side === 'left' ? 'bridal_party_count_left' : 'bridal_party_count_right';
    const totalCount = floorPlan[countKey] || 0;
    const savedRole = floorPlan[key]?.[index];
    
    // Get the calculated default role for this position
    const defaultRole = getDefaultBridalRole(side, index, floorPlan.couple_side_arrangement, totalCount);
    
    // Only use saved role if it's a truly custom role (not a standard default)
    // This ensures Maid of Honor/Best Man are always at the correct position
    const standardRoles = ['Best Man', 'Groomsman', 'Maid of Honor', 'Bridesmaid'];
    if (savedRole && !standardRoles.includes(savedRole)) {
      return savedRole; // Custom role like "Junior Bridesmaid", "Ring Bearer", etc.
    }
    
    // Otherwise, always use the calculated default based on position
    return defaultRole;
  }, [floorPlan]);

  useEffect(() => {
    fetchFloorPlan();
  }, [fetchFloorPlan]);

  return {
    floorPlan: floorPlan?.event_id === eventId ? floorPlan : null,
    loading: loading || Boolean(eventId && floorPlan && floorPlan.event_id !== eventId),
    initialLoadComplete: initialLoadComplete && (!floorPlan || floorPlan.event_id === eventId),
    createFloorPlan,
    updateFloorPlan,
    updateSeatAssignment,
    updateBridalPartyMember,
    updateBridalPartyRole,
    getSeatName,
    getBridalPartyName,
    getBridalPartyRole,
    refetch: fetchFloorPlan,
    defaultFloorPlan,
  };
};
