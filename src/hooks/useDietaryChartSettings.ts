import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registerCache } from '@/lib/cacheRegistry';
import {
  DEFAULT_DIETARY_ACCENT_COLOR,
  DietaryAccentColor,
  DietaryGuestTextSize,
  normalizeDietaryAccentColor,
  normalizeDietaryGuestTextSize,
} from '@/lib/dietaryChartSettings';

export interface DietaryChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo' | 'dietary';
  fontSize: DietaryGuestTextSize;
  guestNameColor: DietaryAccentColor;
  guestListColor: DietaryAccentColor;
  dietaryColor: DietaryAccentColor;
  relationshipColor: DietaryAccentColor;
  seatNumberColor: DietaryAccentColor;
  showGuestNames: boolean;
  showGuestList: boolean;
  showDietary: boolean;
  showRelation: boolean;
  showSeatNumbers: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

const DEFAULT_SETTINGS: DietaryChartSettings = {
  sortBy: 'firstName',
  fontSize: 'standard',
  guestNameColor: DEFAULT_DIETARY_ACCENT_COLOR,
  guestListColor: DEFAULT_DIETARY_ACCENT_COLOR,
  dietaryColor: DEFAULT_DIETARY_ACCENT_COLOR,
  relationshipColor: DEFAULT_DIETARY_ACCENT_COLOR,
  seatNumberColor: DEFAULT_DIETARY_ACCENT_COLOR,
  showGuestNames: true,
  showGuestList: true,
  showDietary: true,
  showRelation: true,
  showSeatNumbers: true,
  showLogo: true,
  paperSize: 'A4',
  isBold: false,
  isItalic: false,
  isUnderline: false,
};

// Module-level cache for instant loading on tab switches
const settingsCache = new Map<string, DietaryChartSettings>();
registerCache(() => { settingsCache.clear(); });

type PendingSave = {
  eventId: string;
  settings: DietaryChartSettings;
};

const SAVE_DEBOUNCE_MS = 200;

export const useDietaryChartSettings = (eventId: string | null) => {
  const cached = eventId ? settingsCache.get(eventId) : undefined;
  const [settings, setSettings] = useState<DietaryChartSettings>(cached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cached);
  const { toast } = useToast();
  const settingsRef = useRef(settings);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const persistJobRef = useRef<(job: PendingSave) => Promise<void>>(async () => undefined);
  const loadGenerationRef = useRef(0);

  // Keep the optimistic state reference in sync. Cache writes are event-scoped
  // at load/change time so switching events cannot copy one event's settings to another.
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const loadGeneration = ++loadGenerationRef.current;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    enqueuePendingSave();
    if (!eventId) {
      settingsRef.current = DEFAULT_SETTINGS;
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const eventCachedSettings = settingsCache.get(eventId);
    const initialSettings = eventCachedSettings ?? DEFAULT_SETTINGS;
    settingsRef.current = initialSettings;
    setSettings(initialSettings);
    setLoading(!eventCachedSettings);

    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (loadGeneration !== loadGenerationRef.current) return;
          settingsRef.current = DEFAULT_SETTINGS;
          setSettings(DEFAULT_SETTINGS);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('dietary_chart_settings')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const row = data;
          const loadedSettings: DietaryChartSettings = {
            sortBy: row.sort_by as DietaryChartSettings['sortBy'],
            fontSize: normalizeDietaryGuestTextSize(row.font_size),
            guestNameColor: normalizeDietaryAccentColor(row.guest_name_color),
            guestListColor: normalizeDietaryAccentColor(row.guest_list_color),
            dietaryColor: normalizeDietaryAccentColor(row.dietary_color),
            relationshipColor: normalizeDietaryAccentColor(row.relationship_color),
            seatNumberColor: normalizeDietaryAccentColor(row.seat_number_color),
            showGuestNames: row.show_guest_names ?? true,
            showGuestList: row.show_guest_list ?? true,
            showDietary: row.show_dietary ?? true,
            showRelation: row.show_relation,
            showSeatNumbers: row.show_seat_numbers ?? row.show_seat_no,
            showLogo: row.show_logo,
            paperSize: row.paper_size as DietaryChartSettings['paperSize'],
            isBold: row.is_bold ?? false,
            isItalic: row.is_italic ?? false,
            isUnderline: row.is_underline ?? false,
          };
          if (loadGeneration !== loadGenerationRef.current) return;
          settingsRef.current = loadedSettings;
          settingsCache.set(eventId, loadedSettings);
          setSettings(loadedSettings);
        } else {
          if (loadGeneration !== loadGenerationRef.current) return;
          settingsRef.current = DEFAULT_SETTINGS;
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error loading dietary chart settings:', error);
        if (loadGeneration !== loadGenerationRef.current) return;
        settingsRef.current = DEFAULT_SETTINGS;
        setSettings(DEFAULT_SETTINGS);
      } finally {
        if (loadGeneration === loadGenerationRef.current) setLoading(false);
      }
    };

    loadSettings();
  }, [eventId]);

  persistJobRef.current = async ({ eventId: jobEventId, settings: settingsToSave }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Cannot save dietary chart settings without an authenticated user.');

      const payload = {
        event_id: jobEventId,
        user_id: user.id,
        sort_by: settingsToSave.sortBy,
        font_size: settingsToSave.fontSize,
        guest_name_color: settingsToSave.guestNameColor,
        guest_list_color: settingsToSave.guestListColor,
        dietary_color: settingsToSave.dietaryColor,
        relationship_color: settingsToSave.relationshipColor,
        seat_number_color: settingsToSave.seatNumberColor,
        show_guest_names: settingsToSave.showGuestNames,
        show_guest_list: settingsToSave.showGuestList,
        show_dietary: settingsToSave.showDietary,
        show_relation: settingsToSave.showRelation,
        show_seat_numbers: settingsToSave.showSeatNumbers,
        show_logo: settingsToSave.showLogo,
        paper_size: settingsToSave.paperSize,
        is_bold: settingsToSave.isBold,
        is_italic: settingsToSave.isItalic,
        is_underline: settingsToSave.isUnderline,
      };

      const { error } = await supabase
        .from('dietary_chart_settings')
        .upsert(payload, { onConflict: 'event_id,user_id' });

      if (error) throw error;
    } catch (error) {
      const databaseError = error as { message?: string; code?: string; details?: string | null; hint?: string | null };
      console.error('Error saving dietary chart settings:', {
        message: databaseError.message,
        code: databaseError.code,
        details: databaseError.details,
        hint: databaseError.hint,
        eventId: jobEventId,
        conflictKey: 'event_id,user_id',
      });
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const enqueuePendingSave = () => {
    const job = pendingSaveRef.current;
    if (!job) return;
    pendingSaveRef.current = null;
    saveChainRef.current = saveChainRef.current.then(() => persistJobRef.current(job));
  };

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    enqueuePendingSave();
  }, []);

  const saveSettings = (newSettings: Partial<DietaryChartSettings>) => {
    const updatedSettings = { ...settingsRef.current, ...newSettings };
    settingsRef.current = updatedSettings;
    setSettings(updatedSettings);

    if (!eventId) return;
    settingsCache.set(eventId, updatedSettings);
    pendingSaveRef.current = { eventId, settings: updatedSettings };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(enqueuePendingSave, SAVE_DEBOUNCE_MS);
  };

  return {
    settings,
    loading,
    updateSettings: saveSettings,
  };
};
