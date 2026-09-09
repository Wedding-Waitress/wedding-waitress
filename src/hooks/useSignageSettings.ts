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
  const settingsRef = useRef(settings);
  const pendingRef = useRef<Partial<SignageSettings>>({});
  const waitersRef = useRef<Array<(saved: boolean) => void>>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedChangesRef = useRef(new Map<string, Partial<SignageSettings>>());
  const loadVersionRef = useRef(0);

  const flushPending = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    const current = settingsRef.current;
    const changes = pendingRef.current;
    if (!current?.id || !Object.keys(changes).length) return;
    const waiters = waitersRef.current;
    pendingRef.current = {};
    waitersRef.current = [];
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const updates = { ...failedChangesRef.current.get(current.id!), ...changes };
      try {
        const { error } = await supabase.from('signage_settings').update(updates as any)
          .eq('id', current.id!).eq('event_id', current.event_id).select('id').single();
        if (error) throw error;
        failedChangesRef.current.delete(current.id!);
        waiters.forEach(resolve => resolve(true));
      } catch (error) {
        failedChangesRef.current.set(current.id!, updates);
        console.error('signage_settings update error', error);
        toast({ title: 'Error', description: 'Failed to save signage settings. Please try your change again.', variant: 'destructive' });
        waiters.forEach(resolve => resolve(false));
      }
    });
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    const version = ++loadVersionRef.current;
    if (!eventId) {
      setSettings(null);
      settingsRef.current = null;
      return;
    }
    settingsRef.current = cache.get(eventId) ?? null;
    setSettings(settingsRef.current);
    if (!cache.has(eventId)) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (version !== loadVersionRef.current) return;
      if (!user) { setLoading(false); return; }

      const { data, error } = await (supabase as any)
        .from('signage_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (version !== loadVersionRef.current) return;

      if (error) {
        throw error;
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
        settingsRef.current = parsed;
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
        if (version !== loadVersionRef.current) return;
        if (insErr) {
          throw insErr;
        } else if (inserted) {
          const parsed = { ...def, id: inserted.id } as SignageSettings;
          setSettings(parsed);
          settingsRef.current = parsed;
          cache.set(eventId, parsed);
        }
      }
    } catch (error) {
      if (version === loadVersionRef.current) {
        console.error('signage_settings fetch error', error);
        toast({ title: 'Could not load sign', description: 'Please reload to try again. Your saved sign has not been changed.', variant: 'destructive' });
      }
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    void fetchSettings();
    return () => { loadVersionRef.current++; flushPending(); };
  }, [fetchSettings, flushPending]);

  const updateSettings = useCallback(async (updates: Partial<SignageSettings>) => {
    const current = settingsRef.current;
    if (!eventId || !current?.id || current.event_id !== eventId) return false;
    const next = { ...current, ...updates };
    settingsRef.current = next;
    setSettings(next);
    cache.set(eventId, next);

    pendingRef.current = { ...pendingRef.current, ...updates };
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushPending, 300);
    return new Promise<boolean>(resolve => { waitersRef.current.push(resolve); });
  }, [eventId, flushPending]);

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
