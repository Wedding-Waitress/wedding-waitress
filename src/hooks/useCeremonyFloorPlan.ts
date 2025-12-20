import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

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
  created_at: string;
  updated_at: string;
}

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
};

export const useCeremonyFloorPlan = (eventId: string | null) => {
  const [floorPlan, setFloorPlan] = useState<CeremonyFloorPlan | null>(null);
  const [loading, setLoading] = useState(true); // Start as true to prevent premature creation
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const { toast } = useToast();

  const fetchFloorPlan = useCallback(async () => {
    if (!eventId) {
      setFloorPlan(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceremony_floor_plans')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Parse seat_assignments from Json to SeatAssignment[]
        const seatAssignments = Array.isArray(data.seat_assignments) 
          ? (data.seat_assignments as unknown as SeatAssignment[])
          : [];
        
        // Parse bridal party arrays
        const bridalPartyLeft = Array.isArray((data as any).bridal_party_left)
          ? ((data as any).bridal_party_left as string[])
          : [];
        const bridalPartyRight = Array.isArray((data as any).bridal_party_right)
          ? ((data as any).bridal_party_right as string[])
          : [];
        
        setFloorPlan({
          ...data,
          seat_assignments: seatAssignments,
          bridal_party_left: bridalPartyLeft,
          bridal_party_right: bridalPartyRight,
          bridal_party_count_left: (data as any).bridal_party_count_left ?? 3,
          bridal_party_count_right: (data as any).bridal_party_count_right ?? 3,
        });
      } else {
        setFloorPlan(null);
      }
    } catch (error) {
      console.error('Error fetching ceremony floor plan:', error);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [eventId]);

  const createFloorPlan = useCallback(async () => {
    if (!eventId) return null;

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
        bridal_party_count_left: (data as any).bridal_party_count_left ?? 3,
        bridal_party_count_right: (data as any).bridal_party_count_right ?? 3,
      };

      setFloorPlan(newPlan);
      return newPlan;
    } catch (error: any) {
      console.error('Error creating ceremony floor plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create floor plan',
        variant: 'destructive',
      });
      return null;
    }
  }, [eventId, toast, fetchFloorPlan, floorPlan]);

  const updateFloorPlan = useCallback(async (updates: Partial<Omit<CeremonyFloorPlan, 'id' | 'event_id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!floorPlan) return false;

    try {
      // Convert arrays to Json for Supabase
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.seat_assignments) {
        dbUpdates.seat_assignments = updates.seat_assignments as unknown as Json;
      }
      if (updates.bridal_party_left) {
        dbUpdates.bridal_party_left = updates.bridal_party_left as unknown as Json;
      }
      if (updates.bridal_party_right) {
        dbUpdates.bridal_party_right = updates.bridal_party_right as unknown as Json;
      }

      const { error } = await supabase
        .from('ceremony_floor_plans')
        .update(dbUpdates)
        .eq('id', floorPlan.id);

      if (error) throw error;

      // Update local state immediately
      setFloorPlan(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error: any) {
      console.error('Error updating ceremony floor plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      });
      return false;
    }
  }, [floorPlan, toast]);

  const updateSeatAssignment = useCallback(async (
    side: 'left' | 'right',
    row: number,
    seat: number,
    name: string
  ) => {
    if (!floorPlan) return false;

    const existingAssignments = floorPlan.seat_assignments || [];
    
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
    const currentArray = [...(floorPlan[key] || [])];
    
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

  useEffect(() => {
    fetchFloorPlan();
  }, [fetchFloorPlan]);

  return {
    floorPlan,
    loading,
    initialLoadComplete,
    createFloorPlan,
    updateFloorPlan,
    updateSeatAssignment,
    updateBridalPartyMember,
    getSeatName,
    getBridalPartyName,
    refetch: fetchFloorPlan,
    defaultFloorPlan,
  };
};
