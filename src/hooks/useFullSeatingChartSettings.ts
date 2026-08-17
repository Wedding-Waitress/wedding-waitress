import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registerCache } from '@/lib/cacheRegistry';
import { FullSeatingChartColor, FullSeatingChartGuestTextSize, normalizeFullSeatingChartColor, normalizeFullSeatingChartGuestTextSize } from '@/lib/fullSeatingChartDisplaySettings';

export interface FullSeatingChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: FullSeatingChartGuestTextSize;
  showDietary: boolean;
  showGuestNames: boolean;
  showSeatNumbers: boolean;
  showGuestList: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  guestNameColor: FullSeatingChartColor;
  seatNumberColor: FullSeatingChartColor;
  guestListColor: FullSeatingChartColor;
  dietaryColor: FullSeatingChartColor;
  relationshipColor: FullSeatingChartColor;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

const DEFAULT_SETTINGS: FullSeatingChartSettings = {
  sortBy: 'firstName',
  fontSize: 'standard',
  showDietary: false,
  showGuestNames: true,
  showSeatNumbers: true,
  showGuestList: true,
  showRsvp: false,
  showRelation: false,
  guestNameColor: '#000000',
  seatNumberColor: '#000000',
  guestListColor: '#000000',
  dietaryColor: '#000000',
  relationshipColor: '#000000',
  showLogo: true,
  paperSize: 'A4',
  isBold: true,
  isItalic: false,
  isUnderline: false,
};

// Module-level cache for instant loading on tab switches
const settingsCache = new Map<string, FullSeatingChartSettings>();
registerCache(() => { settingsCache.clear(); });

type PendingSave = {
  eventId: string;
  settings: FullSeatingChartSettings;
};

const SAVE_DEBOUNCE_MS = 200;

export const useFullSeatingChartSettings = (eventId: string | null) => {
  const cached = eventId ? settingsCache.get(eventId) : undefined;
  const [settings, setSettings] = useState<FullSeatingChartSettings>(cached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const settingsRef = useRef(settings);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const persistJobRef = useRef<(job: PendingSave) => Promise<void>>(async () => undefined);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load settings from database
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
          .from('full_seating_chart_settings')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const loadedSettings: FullSeatingChartSettings = {
            sortBy: data.sort_by as 'firstName' | 'lastName' | 'tableNo',
            fontSize: normalizeFullSeatingChartGuestTextSize(data.font_size),
            showDietary: data.show_dietary,
            showGuestNames: data.show_guest_names ?? true,
            showSeatNumbers: data.show_seat_numbers ?? true,
            showGuestList: data.show_guest_list ?? true,
            showRsvp: data.show_rsvp,
            showRelation: data.show_relation,
            guestNameColor: normalizeFullSeatingChartColor(data.guest_name_color),
            seatNumberColor: normalizeFullSeatingChartColor(data.seat_number_color),
            guestListColor: normalizeFullSeatingChartColor(data.guest_list_color),
            dietaryColor: normalizeFullSeatingChartColor(data.dietary_color),
            relationshipColor: normalizeFullSeatingChartColor(data.relationship_color),
            showLogo: data.show_logo ?? true,
            paperSize: data.paper_size as 'A4' | 'A3' | 'A2' | 'A1',
            isBold: data.is_bold ?? true,
            isItalic: data.is_italic ?? false,
            isUnderline: data.is_underline ?? false,
          };
          if (loadGeneration !== loadGenerationRef.current) return;
          settingsRef.current = loadedSettings;
          settingsCache.set(eventId, loadedSettings);
          setSettings(loadedSettings);
        } else if (loadGeneration === loadGenerationRef.current) {
          settingsRef.current = DEFAULT_SETTINGS;
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        if (loadGeneration === loadGenerationRef.current) setLoading(false);
      }
    };

    loadSettings();
  }, [eventId]);

  persistJobRef.current = async ({ eventId: jobEventId, settings: settingsToSave }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Cannot save Full Seating Chart settings without an authenticated user.');

      const { error } = await supabase
        .from('full_seating_chart_settings')
        .upsert({
          event_id: jobEventId,
          user_id: user.id,
          sort_by: settingsToSave.sortBy,
          font_size: settingsToSave.fontSize,
          show_dietary: settingsToSave.showDietary,
          show_guest_names: settingsToSave.showGuestNames,
          show_seat_numbers: settingsToSave.showSeatNumbers,
          show_guest_list: settingsToSave.showGuestList,
          show_rsvp: settingsToSave.showRsvp,
          show_relation: settingsToSave.showRelation,
          guest_name_color: settingsToSave.guestNameColor,
          seat_number_color: settingsToSave.seatNumberColor,
          guest_list_color: settingsToSave.guestListColor,
          dietary_color: settingsToSave.dietaryColor,
          relationship_color: settingsToSave.relationshipColor,
          show_logo: settingsToSave.showLogo,
          paper_size: settingsToSave.paperSize,
          is_bold: settingsToSave.isBold,
          is_italic: settingsToSave.isItalic,
          is_underline: settingsToSave.isUnderline,
        }, {
          onConflict: 'event_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      const databaseError = error as { message?: string; code?: string; details?: string | null; hint?: string | null };
      console.error('Error saving Full Seating Chart settings:', {
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

  const saveSettings = (newSettings: Partial<FullSeatingChartSettings>) => {
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
