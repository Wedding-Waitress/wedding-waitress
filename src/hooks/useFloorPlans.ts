import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FloorPlan {
  id: string;
  user_id: string;
  event_id: string | null;
  name: string;
  description: string | null;
  canvas_data: any;
  settings: {
    width: number;
    height: number;
    gridSize: number;
    showGrid: boolean;
    snapToGrid: boolean;
    measurementUnit: 'feet' | 'meters';
  };
  room_dimensions: {
    width: number;
    height: number;
    realWidth: number;
    realHeight: number;
    unit: string;
  };
  is_template: boolean;
  template_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  guest_capacity_min: number | null;
  guest_capacity_max: number | null;
  preview_image_url: string | null;
  canvas_data: any;
  is_public: boolean;
  created_at: string;
}

export const useFloorPlans = (eventId: string | null) => {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [templates, setTemplates] = useState<FloorPlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFloorPlan, setActiveFloorPlan] = useState<FloorPlan | null>(null);
  const { toast } = useToast();

  const fetchFloorPlans = useCallback(async () => {
    if (!eventId) {
      setFloorPlans([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching floor plans:', error);
        toast({
          title: "Error",
          description: "Failed to fetch floor plans",
          variant: "destructive",
        });
        return;
      }

      const formattedData = (data || []).map(item => ({
        ...item,
        canvas_data: item.canvas_data as any,
        settings: item.settings as FloorPlan['settings'],
        room_dimensions: item.room_dimensions as FloorPlan['room_dimensions'],
      }));
      
      setFloorPlans(formattedData);
      if (formattedData && formattedData.length > 0 && !activeFloorPlan) {
        setActiveFloorPlan(formattedData[0]);
      }
    } catch (error) {
      console.error('Error fetching floor plans:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast, activeFloorPlan]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('floor_plan_templates')
        .select('*')
        .eq('is_public', true)
        .order('name');

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const createFloorPlan = async (floorPlanData: {
    name: string;
    description?: string;
    canvas_data?: any;
    settings?: Partial<FloorPlan['settings']>;
    room_dimensions?: Partial<FloorPlan['room_dimensions']>;
  }) => {
    if (!eventId) return false;

    try {
      const { data, error } = await supabase
        .from('floor_plans')
        .insert({
          event_id: eventId,
          name: floorPlanData.name,
          description: floorPlanData.description || null,
          canvas_data: floorPlanData.canvas_data || {},
          settings: {
            width: 800,
            height: 600,
            gridSize: 20,
            showGrid: true,
            snapToGrid: true,
            measurementUnit: 'feet',
            ...floorPlanData.settings,
          },
          room_dimensions: {
            width: 0,
            height: 0,
            realWidth: 0,
            realHeight: 0,
            unit: 'feet',
            ...floorPlanData.room_dimensions,
          },
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating floor plan:', error);
        toast({
          title: "Error",
          description: "Failed to create floor plan",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Floor plan created successfully",
      });

      await fetchFloorPlans();
      const formattedData = {
        ...data,
        canvas_data: data.canvas_data as any,
        settings: data.settings as FloorPlan['settings'],
        room_dimensions: data.room_dimensions as FloorPlan['room_dimensions'],
      };
      setActiveFloorPlan(formattedData);
      return true;
    } catch (error) {
      console.error('Error creating floor plan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateFloorPlan = async (floorPlanId: string, updates: Partial<FloorPlan>) => {
    try {
      const { error } = await supabase
        .from('floor_plans')
        .update(updates)
        .eq('id', floorPlanId);

      if (error) {
        console.error('Error updating floor plan:', error);
        toast({
          title: "Error",
          description: "Failed to update floor plan",
          variant: "destructive",
        });
        return false;
      }

      await fetchFloorPlans();
      return true;
    } catch (error) {
      console.error('Error updating floor plan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFloorPlan = async (floorPlanId: string) => {
    try {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', floorPlanId);

      if (error) {
        console.error('Error deleting floor plan:', error);
        toast({
          title: "Error",
          description: "Failed to delete floor plan",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Floor plan deleted successfully",
      });

      await fetchFloorPlans();
      if (activeFloorPlan?.id === floorPlanId) {
        setActiveFloorPlan(null);
      }
      return true;
    } catch (error) {
      console.error('Error deleting floor plan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchFloorPlans();
    fetchTemplates();
  }, [fetchFloorPlans, fetchTemplates]);

  return {
    floorPlans,
    templates,
    loading,
    activeFloorPlan,
    setActiveFloorPlan,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    refetch: fetchFloorPlans,
  };
};