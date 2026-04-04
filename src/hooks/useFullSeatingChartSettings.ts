import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FullSeatingChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: 'small' | 'medium' | 'large';
  showDietary: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

const DEFAULT_SETTINGS: FullSeatingChartSettings = {
  sortBy: 'firstName',
  fontSize: 'small', // Hardcoded to small (13px) - no longer user-configurable
  showDietary: false,
  showRsvp: false,
  showRelation: false,
  showLogo: true,
  paperSize: 'A4',
  isBold: true,
  isItalic: false,
  isUnderline: false,
};

// Module-level cache for instant loading on tab switches
const settingsCache = new Map<string, FullSeatingChartSettings>();

export const useFullSeatingChartSettings = (eventId: string | null) => {
  const cached = eventId ? settingsCache.get(eventId) : undefined;
  const [settings, setSettings] = useState<FullSeatingChartSettings>(cached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Keep cache in sync
  useEffect(() => {
    if (eventId && settings) settingsCache.set(eventId, settings);
  }, [eventId, settings]);

  // Load settings from database
  useEffect(() => {
    if (!eventId) return;

    const loadSettings = async () => {
      if (!settingsCache.has(eventId)) setLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return;

        const { data, error } = await supabase
          .from('full_seating_chart_settings')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', session.session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            sortBy: data.sort_by as 'firstName' | 'lastName' | 'tableNo',
            fontSize: 'small', // Always small - hardcoded
            showDietary: data.show_dietary,
            showRsvp: data.show_rsvp,
            showRelation: data.show_relation,
            showLogo: data.show_logo ?? true,
            paperSize: data.paper_size as 'A4' | 'A3' | 'A2' | 'A1',
            isBold: (data as any).is_bold ?? true,
            isItalic: (data as any).is_italic ?? false,
            isUnderline: (data as any).is_underline ?? false,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [eventId]);

  // Save settings to database
  const saveSettings = async (newSettings: Partial<FullSeatingChartSettings>) => {
    if (!eventId) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { error } = await supabase
        .from('full_seating_chart_settings')
        .upsert({
          event_id: eventId,
          user_id: session.session.user.id,
          sort_by: updatedSettings.sortBy,
          font_size: updatedSettings.fontSize,
          show_dietary: updatedSettings.showDietary,
          show_rsvp: updatedSettings.showRsvp,
          show_relation: updatedSettings.showRelation,
          show_logo: updatedSettings.showLogo,
          paper_size: updatedSettings.paperSize,
          is_bold: updatedSettings.isBold,
          is_italic: updatedSettings.isItalic,
          is_underline: updatedSettings.isUnderline,
        } as any, {
          onConflict: 'event_id,user_id'
        });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your chart settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return {
    settings,
    loading,
    updateSettings: saveSettings,
  };
};
