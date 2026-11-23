import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { resolveWeddingFontZones } from '@/lib/localWeddingFonts';
import { SignageDesignHistory, sameDesign, signageHistoryGroup, type SignageDesign } from '@/lib/signageDesignHistory';
import { resolveInvitationCardSize } from '@/lib/invitationCardSizes';

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
  rotation: number;
  event_id: string | null;
}

export const DEFAULT_QR_CONFIG: QrConfig = {
  enabled: false,
  x_percent: 50,
  y_percent: 90,
  size_percent: 15,
  rotation: 0,
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
  notes?: string;
  canva_template_url?: string | null;
  qr_config: QrConfig;
  created_at?: string;
  updated_at?: string;
}

export const invitationCardSettingsFromRow = (d: any): InvitationCardSettings => ({
  ...d,
  background_image_type: d.background_image_type as 'none' | 'full',
  text_zones: resolveWeddingFontZones((d.text_zones || []) as TextZone[]),
  card_type: (d.card_type || 'invitation') as CardType,
  name: d.name || 'Untitled',
  qr_config: (d.qr_config || { ...DEFAULT_QR_CONFIG }) as QrConfig,
});

// Only document state enters history; identity, timestamps and artwork names stay attached to their records.
type CardDesign = Omit<InvitationCardSettings, 'id'|'event_id'|'user_id'|'created_at'|'updated_at'|'name'|'card_type'>;
const cardDesign = (settings: InvitationCardSettings): CardDesign => {
  const { id, event_id, user_id, created_at, updated_at, name, card_type, ...design } = settings;
  return JSON.parse(JSON.stringify(design));
};
// Module-level cache for instant loading on tab switches
const invitationCache = new Map<string, { artworks: InvitationCardSettings[]; activeId: string | null }>();
registerCache(() => { invitationCache.clear(); });
registerEventCache((eventId) => { invitationCache.delete(eventId); });

export const useInvitationCardSettings = (eventId: string | null) => {
  const cached = eventId ? invitationCache.get(eventId) : undefined;
  const [artworks, setArtworks] = useState<InvitationCardSettings[]>(cached?.artworks ?? []);
  const [activeArtworkId, setActiveArtworkId] = useState<string | null>(cached?.activeId ?? null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const artworksRef = useRef(artworks);
  artworksRef.current = artworks;
  const selectedIdRef = useRef(activeArtworkId);
  selectedIdRef.current = activeArtworkId;
  const loadVersion = useRef(0);
  const histories = useRef(new Map<string, SignageDesignHistory<CardDesign>>());
  const [, redrawHistory] = useState(0);
  const historyKey = (a: InvitationCardSettings) => [a.user_id, a.event_id, a.id].join(':');
  const historyFor = (a: InvitationCardSettings) => {
    const key = historyKey(a), current = cardDesign(a);
    let history = histories.current.get(key);
    if (!history || !sameDesign(history.present, current)) {
      history = new SignageDesignHistory(current);
      histories.current.set(key, history);
    }
    return history;
  };
  const currentArtwork = () => artworksRef.current.find(a => a.id === selectedIdRef.current && a.event_id === eventId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const pendingRef = useRef(new Map<string, { event: string; updates: Partial<InvitationCardSettings>; resolve: Array<(saved: boolean) => void> }>());
  const writesRef = useRef<Promise<void>>(Promise.resolve());
  const flushPending = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    const batch = [...pendingRef.current.entries()];
    pendingRef.current.clear();
    for (const [id, pending] of batch) {
      writesRef.current = writesRef.current.then(async () => {
        let saved = false;
        try {
          const { data, error } = await supabase.from('invitation_card_settings' as any)
            .update(pending.updates).eq('id', id).eq('event_id', pending.event).select('id').single();
          if (error || !data) throw error || new Error('Artwork was not saved');
          saved = true;
        } catch (error) {
          console.error('Error saving invitation artwork:', error);
          toast({ title: 'Could not save card', description: 'Your last changes were not saved. Please try again.', variant: 'destructive' });
        }
        pending.resolve.forEach(resolve => resolve(saved));
      });
    }
    return writesRef.current;
  }, [toast]);
  useEffect(() => () => { void flushPending(); }, [eventId, flushPending]);

  // Keep cache in sync
  useEffect(() => {
    if (eventId && artworks.every(a => a.event_id === eventId)) invitationCache.set(eventId, { artworks, activeId: activeArtworkId });
  }, [eventId, artworks, activeArtworkId]);

  const activeArtwork = useMemo(
    () => artworks.find(a => a.id === activeArtworkId && a.event_id === eventId) || null,
    [artworks, activeArtworkId, eventId]
  );

  const fetchSettings = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!eventId) {
      setArtworks([]);
      setActiveArtworkId(null);
      return;
    }

    const cached = invitationCache.get(eventId);
    setArtworks(cached?.artworks || []);
    setActiveArtworkId(cached?.activeId || null);
    if (!cached) setLoading(true);
    try {
      await flushPending();
      if (version !== loadVersion.current) return;
      const { data, error } = await supabase
        .from('invitation_card_settings' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (version !== loadVersion.current) return;
      if (error) {
        console.error('Error fetching invitation card settings:', error);
        return;
      }

      const parsed = (data || []).map((d: any) => invitationCardSettingsFromRow(d));
      parsed.forEach(historyFor);
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
      if (version === loadVersion.current) setLoading(false);
    }
  }, [eventId]);

  const applySettings = (current: InvitationCardSettings, newSettings: Partial<InvitationCardSettings>) => {
    const activeArtworkId = current.id!;

    // Optimistic: update local state immediately so canvas reflects changes instantly
    const next = artworksRef.current.map(a => a.id === activeArtworkId ? { ...a, ...newSettings } : a);
    artworksRef.current = next;
    setArtworks(next);

    const pending = pendingRef.current.get(activeArtworkId) || { event: eventId, updates: {}, resolve: [] as Array<(saved: boolean) => void> };
    pending.updates = { ...pending.updates, ...newSettings };
    pendingRef.current.set(activeArtworkId, pending);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushPending, 300);
    return new Promise<boolean>(resolve => pending.resolve.push(resolve));
  };

  const updateSettings = async (newSettings: Partial<InvitationCardSettings>, options?: { historyGroup?: false }) => {
    const current = currentArtwork();
    if (!current?.id) return false;
    const history = historyFor(current), before = cardDesign(current), after = cardDesign({ ...current, ...newSettings });
    const group = options?.historyGroup === false ? null : signageHistoryGroup(before as SignageDesign, after as SignageDesign);
    if (!history.record(after, group)) return true;
    redrawHistory(value => value + 1);
    return applySettings(current, newSettings);
  };
  const restoreHistory = async (direction: 'undo'|'redo') => {
    const current = currentArtwork();
    if (!current?.id) return false;
    const history = historyFor(current), restored = direction === 'undo' ? history.undo() : history.redo();
    if (!restored) return false;
    redrawHistory(value => value + 1);
    return applySettings(current, restored);
  };
  const breakHistoryGroup = () => { const current = currentArtwork(); if(current) histories.current.get(historyKey(current))?.breakGroup(); };
  const activeHistory = activeArtwork ? histories.current.get(historyKey(activeArtwork)) : undefined;

  const createArtwork = async (cardType: CardType, name: string, cardSize?: string) => {
    if (!eventId) return null;

    const resolvedSize = resolveInvitationCardSize(cardType, cardSize);

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

      const created = invitationCardSettingsFromRow(result.data);
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
    await flushPending();
    const deletedKind = artworks.find(a => a.id === id)?.card_type;
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
          setActiveArtworkId(remaining.find(a => a.card_type === deletedKind)?.id || null);
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
    await flushPending();
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

      const created = invitationCardSettingsFromRow(result.data);
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
    setActiveArtwork: (id: string | null) => { void flushPending(); setActiveArtworkId(id); },
    createArtwork,
    deleteArtwork,
    duplicateArtwork,
    renameArtwork,
    loading,
    updateSettings,
    canUndo: activeHistory?.canUndo ?? false,
    canRedo: activeHistory?.canRedo ?? false,
    undo: () => restoreHistory('undo'),
    redo: () => restoreHistory('redo'),
    breakHistoryGroup,
    refetchSettings: fetchSettings,
  };
};
