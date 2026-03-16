import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TextZone {
  id: string;
  label: string;
  type: 'preset' | 'custom';
  preset_field?: string;
  text: string;
  font_family: string;
  font_size: number;
  font_color: string;
  font_weight: string;
  font_style: string;
  text_align: string;
  text_case: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  rotation: number;
}

export interface QrConfig {
  enabled: boolean;
  x_percent: number;
  y_percent: number;
  size_percent: number;
  event_id: string | null;
}

export const DEFAULT_QR_CONFIG: QrConfig = {
  enabled: false,
  x_percent: 50,
  y_percent: 90,
  size_percent: 15,
  event_id: null,
};

export type CardType = 'invitation' | 'save_the_date' | 'thank_you';

export interface InvitationCardSettings {
  id?: string;
  event_id: string;
  user_id: string;
  background_color: string;
  background_image_url?: string | null;
  background_image_type: 'none' | 'full';
  background_image_x_position: number;
  background_image_y_position: number;
  background_image_opacity: number;
  text_zones: TextZone[];
  font_color: string;
  card_size: string;
  orientation: string;
  card_type: CardType;
  name: string;
  canva_template_url?: string | null;
  qr_config: QrConfig;
  created_at?: string;
  updated_at?: string;
}
  background_image_y_position: number;
  background_image_opacity: number;
  text_zones: TextZone[];
  font_color: string;
  card_size: string;
  orientation: string;
  card_type: CardType;
  name: string;
  canva_template_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

const parseRow = (d: any): InvitationCardSettings => ({
  ...d,
  background_image_type: d.background_image_type as 'none' | 'full',
  text_zones: (d.text_zones || []) as TextZone[],
  card_type: (d.card_type || 'invitation') as CardType,
  name: d.name || 'Untitled',
});

export const useInvitationCardSettings = (eventId: string | null) => {
  const [artworks, setArtworks] = useState<InvitationCardSettings[]>([]);
  const [activeArtworkId, setActiveArtworkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup debounce timer on unmount
  useEffect(() => () => { clearTimeout(saveTimerRef.current); }, []);

  const activeArtwork = useMemo(
    () => artworks.find(a => a.id === activeArtworkId) || null,
    [artworks, activeArtworkId]
  );

  const fetchSettings = useCallback(async () => {
    if (!eventId) {
      setArtworks([]);
      setActiveArtworkId(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitation_card_settings' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching invitation card settings:', error);
        return;
      }

      const parsed = (data || []).map((d: any) => parseRow(d));
      setArtworks(parsed);

      // Keep active if still valid, otherwise select first
      if (parsed.length > 0) {
        const stillExists = parsed.some(a => a.id === activeArtworkId);
        if (!stillExists) setActiveArtworkId(parsed[0].id!);
      } else {
        setActiveArtworkId(null);
      }
    } catch (error) {
      console.error('Error fetching invitation card settings:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const updateSettings = async (newSettings: Partial<InvitationCardSettings>) => {
    if (!eventId || !activeArtworkId) return false;

    // Optimistic: update local state immediately so canvas reflects changes instantly
    setArtworks(prev => prev.map(a => a.id === activeArtworkId ? { ...a, ...newSettings } : a));

    // Debounce the actual Supabase persistence
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
          return;
        }

        const result = await supabase
          .from('invitation_card_settings' as any)
          .update(newSettings)
          .eq('id', activeArtworkId);

        if (result.error) {
          console.error('Error updating invitation card settings:', result.error);
          toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        }
      } catch (error) {
        console.error('Error updating invitation card settings:', error);
        toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      }
    }, 300);

    return true;
  };

  const createArtwork = async (cardType: CardType, name: string, cardSize?: string) => {
    if (!eventId) return null;

    // Enforce size rules per card type
    let resolvedSize = cardSize || 'A4';
    if (cardType === 'invitation') resolvedSize = 'A4';
    else if (cardType === 'save_the_date' && !['A4', 'A5'].includes(resolvedSize)) resolvedSize = 'A5';
    else if (cardType === 'thank_you' && !['A4', 'A5', 'A6'].includes(resolvedSize)) resolvedSize = 'A6';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const result = await supabase
        .from('invitation_card_settings' as any)
        .insert({
          event_id: eventId,
          user_id: user.id,
          card_type: cardType,
          name,
          card_size: resolvedSize,
        })
        .select()
        .single();

      if (result.error) {
        toast({ title: "Error", description: "Failed to create artwork", variant: "destructive" });
        return null;
      }

      const created = parseRow(result.data);
      setArtworks(prev => [...prev, created]);
      setActiveArtworkId(created.id!);
      toast({ title: "Created", description: `"${name}" created successfully` });
      return created;
    } catch (error) {
      console.error('Error creating artwork:', error);
      return null;
    }
  };

  const deleteArtwork = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitation_card_settings' as any)
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: "Error", description: "Failed to delete artwork", variant: "destructive" });
        return false;
      }

      setArtworks(prev => {
        const remaining = prev.filter(a => a.id !== id);
        if (activeArtworkId === id) {
          setActiveArtworkId(remaining[0]?.id || null);
        }
        return remaining;
      });
      toast({ title: "Deleted", description: "Artwork deleted" });
      return true;
    } catch (error) {
      console.error('Error deleting artwork:', error);
      return false;
    }
  };

  const duplicateArtwork = async (id: string) => {
    const source = artworks.find(a => a.id === id);
    if (!source || !eventId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { id: _id, created_at, updated_at, ...rest } = source;
      const result = await supabase
        .from('invitation_card_settings' as any)
        .insert({
          ...rest,
          event_id: eventId,
          user_id: user.id,
          name: `${source.name} (Copy)`,
        })
        .select()
        .single();

      if (result.error) {
        toast({ title: "Error", description: "Failed to duplicate artwork", variant: "destructive" });
        return null;
      }

      const created = parseRow(result.data);
      setArtworks(prev => [...prev, created]);
      setActiveArtworkId(created.id!);
      toast({ title: "Duplicated", description: `"${created.name}" created` });
      return created;
    } catch (error) {
      console.error('Error duplicating artwork:', error);
      return null;
    }
  };

  const renameArtwork = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('invitation_card_settings' as any)
        .update({ name: newName })
        .eq('id', id);

      if (error) {
        toast({ title: "Error", description: "Failed to rename", variant: "destructive" });
        return false;
      }

      setArtworks(prev => prev.map(a => a.id === id ? { ...a, name: newName } : a));
      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    // Legacy compat
    settings: activeArtwork,
    // Multi-artwork API
    artworks,
    activeArtwork,
    activeArtworkId,
    setActiveArtwork: setActiveArtworkId,
    createArtwork,
    deleteArtwork,
    duplicateArtwork,
    renameArtwork,
    loading,
    updateSettings,
    refetchSettings: fetchSettings,
  };
};
