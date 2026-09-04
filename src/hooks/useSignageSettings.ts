import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { resolveWeddingFontZones } from '@/lib/localWeddingFonts';
import type { TextZone, QrConfig, InvitationCardSettings } from '@/hooks/useInvitationCardSettings';
import { previewUrlFor } from '@/lib/imagePipeline';

export interface SignageSettings {
  id?: string;
  event_id: string;
  user_id: string;
  orientation: 'portrait' | 'landscape';
  background_color: string;
  background_image_url?: string | null;
  background_image_print_url?: string | null;
  background_image_type: 'none' | 'full';
  background_image_x_position: number;
  background_image_y_position: number;
  background_image_opacity: number;
  text_zones: TextZone[];
  qr_config: QrConfig;
  notes?: string | null;
}

const DEFAULT_PORTRAIT_QR: QrConfig = {
  enabled: false,
  x_percent: 50,
  y_percent: 82,
  size_percent: 22,
  rotation: 0,
  event_id: null,
};

const DEFAULT_LANDSCAPE_QR: QrConfig = {
  enabled: false,
  x_percent: 78,
  y_percent: 78,
  size_percent: 18,
  rotation: 0,
  event_id: null,
};

const buildDefault = (eventId: string, userId: string, orientation: 'portrait' | 'landscape'): SignageSettings => ({
  event_id: eventId,
  user_id: userId,
  orientation,
  background_color: '#ffffff',
  background_image_url: null,
  background_image_print_url: null,
  background_image_type: 'none',
  background_image_x_position: 50,
  background_image_y_position: 50,
  background_image_opacity: 100,
  text_zones: [],
  qr_config: orientation === 'portrait' ? { ...DEFAULT_PORTRAIT_QR } : { ...DEFAULT_LANDSCAPE_QR },
  notes: '',
});

const cache = new Map<string, SignageSettings>();
registerCache(() => { cache.clear(); });
registerEventCache((eventId) => { cache.delete(eventId); });

export const useSignageSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<SignageSettings | null>(eventId ? cache.get(eventId) ?? null : null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const fetchSettings = useCallback(async () => {
    if (!eventId) {
      setSettings(null);
      return;
    }
    if (!cache.has(eventId)) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await (supabase as any)
        .from('signage_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('signage_settings fetch error', error);
        setLoading(false);
        return;
      }

      if (data) {
        const parsed: SignageSettings = {
          ...data,
          orientation: (data.orientation || 'portrait') as 'portrait' | 'landscape',
          background_image_type: (data.background_image_type || 'none') as 'none' | 'full',
          text_zones: resolveWeddingFontZones((data.text_zones || []) as TextZone[]),
          qr_config: (data.qr_config || DEFAULT_PORTRAIT_QR) as QrConfig,
        };
        if (parsed.background_image_url && !parsed.background_image_print_url) {
          parsed.background_image_print_url = parsed.background_image_url;
          parsed.background_image_url = previewUrlFor(parsed.background_image_url) ?? parsed.background_image_url;
        }
        setSettings(parsed);
        cache.set(eventId, parsed);
      } else {
        // Auto-create default record
        const def = buildDefault(eventId, user.id, 'portrait');
        if (def.background_image_url && !def.background_image_print_url) {
          def.background_image_print_url = def.background_image_url;
          def.background_image_url = previewUrlFor(def.background_image_url) ?? def.background_image_url;
        }
        const { data: inserted, error: insErr } = await (supabase as any)
          .from('signage_settings')
          .insert(def)
          .select()
          .single();
        if (insErr) {
          console.error('signage_settings insert error', insErr);
        } else if (inserted) {
          const parsed = { ...def, id: inserted.id } as SignageSettings;
          setSettings(parsed);
          cache.set(eventId, parsed);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<SignageSettings>) => {
    if (!eventId || !settings?.id) return false;
    const next = { ...settings, ...updates };
    setSettings(next);
    cache.set(eventId, next);

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { error } = await (supabase as any)
        .from('signage_settings')
        .update(updates)
        .eq('id', settings.id);
      if (error) {
        console.error('signage_settings update error', error);
        toast({ title: 'Error', description: 'Failed to save signage settings', variant: 'destructive' });
      }
    }, 300);
    return true;
  }, [eventId, settings, toast]);

  // Adapter so we can feed the shared InvitationCardCustomizer + Preview as-is.
  const asInvitationSettings: InvitationCardSettings | null = useMemo(() => {
    if (!settings) return null;
    return {
      id: settings.id,
      event_id: settings.event_id,
      user_id: settings.user_id,
      background_color: settings.background_color,
      background_image_url: settings.background_image_url,
      background_image_type: settings.background_image_type,
      background_image_x_position: settings.background_image_x_position,
      background_image_y_position: settings.background_image_y_position,
      background_image_opacity: settings.background_image_opacity,
      text_zones: settings.text_zones,
      font_color: '#000000',
      card_size: 'A4',
      orientation: settings.orientation,
      card_type: 'invitation',
      name: 'QR Seating Sign',
      qr_config: settings.qr_config,
    };
  }, [settings]);

  return {
    settings,
    asInvitationSettings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};

export { DEFAULT_PORTRAIT_QR, DEFAULT_LANDSCAPE_QR };
