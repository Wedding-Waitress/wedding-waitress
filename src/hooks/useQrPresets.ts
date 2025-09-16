import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QrDesignData {
  foregroundColor: string;
  backgroundColor: string;
  moduleShape: 'square' | 'round';
  finderStyle: 'standard' | 'rounded';
  frameEnabled: boolean;
  frameStyle: 'rounded' | 'square';
  frameColor: string;
  labelText: string;
  logo: string | null;
  logoMask: 'square' | 'round';
  logoSize: number;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

export interface QrPreset {
  id: string;
  name: string;
  design_data: QrDesignData;
  created_at: string;
  updated_at: string;
}

export const useQrPresets = (eventId: string | null) => {
  const [presets, setPresets] = useState<QrPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch presets for the current event
  const fetchPresets = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('qr_design_presets')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets((data as QrPreset[]) || []);
    } catch (error) {
      console.error('Error fetching QR presets:', error);
      toast({
        title: "Error",
        description: "Failed to load design presets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save current design as a new preset
  const savePreset = async (name: string, designData: QrDesignData) => {
    if (!eventId) return false;

    try {
      const { data, error } = await (supabase as any)
        .from('qr_design_presets')
        .insert({
          name,
          design_data: designData,
          event_id: eventId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setPresets(prev => [data as QrPreset, ...prev]);
      toast({
        title: "Success",
        description: `Design preset "${name}" saved successfully`,
      });
      return true;
    } catch (error) {
      console.error('Error saving preset:', error);
      toast({
        title: "Error",
        description: "Failed to save design preset",
        variant: "destructive",
      });
      return false;
    }
  };

  // Load a preset and apply its design
  const loadPreset = (preset: QrPreset) => {
    toast({
      title: "Success",
      description: `Design preset "${preset.name}" loaded successfully`,
    });
    return preset.design_data;
  };

  // Delete a preset
  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('qr_design_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      setPresets(prev => prev.filter(p => p.id !== presetId));
      toast({
        title: "Success",
        description: "Design preset deleted successfully",
      });
      return true;
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({
        title: "Error",
        description: "Failed to delete design preset",
        variant: "destructive",
      });
      return false;
    }
  };

  // Load presets when eventId changes
  useEffect(() => {
    fetchPresets();
  }, [eventId]);

  return {
    presets,
    loading,
    savePreset,
    loadPreset,
    deletePreset,
    refetchPresets: fetchPresets
  };
};