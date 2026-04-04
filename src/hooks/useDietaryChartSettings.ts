import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DietaryChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo' | 'dietary';
  fontSize: 'small' | 'medium' | 'large';
  showMobile: boolean;
  showRelation: boolean;
  showSeatNo: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

const DEFAULT_SETTINGS: DietaryChartSettings = {
  sortBy: 'firstName',
  fontSize: 'small',
  showMobile: true,
  showRelation: true,
  showSeatNo: true,
  showLogo: true,
  paperSize: 'A4',
  isBold: false,
  isItalic: false,
  isUnderline: false,
};

// Module-level cache for instant loading on tab switches
const settingsCache = new Map<string, DietaryChartSettings>();

export const useDietaryChartSettings = (eventId: string | null) => {
  const cached = eventId ? settingsCache.get(eventId) : undefined;
  const [settings, setSettings] = useState<DietaryChartSettings>(cached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cached);
  const { toast } = useToast();

  // Keep cache in sync
  useEffect(() => {
    if (eventId && settings) settingsCache.set(eventId, settings);
  }, [eventId, settings]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
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
          const row = data as any;
          setSettings({
            sortBy: row.sort_by as DietaryChartSettings['sortBy'],
            fontSize: 'small',
            showMobile: row.show_mobile,
            showRelation: row.show_relation,
            showSeatNo: row.show_seat_no,
            showLogo: row.show_logo,
            paperSize: row.paper_size as DietaryChartSettings['paperSize'],
            isBold: row.is_bold ?? false,
            isItalic: row.is_italic ?? false,
            isUnderline: row.is_underline ?? false,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error loading dietary chart settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [eventId]);

  const saveSettings = async (newSettings: Partial<DietaryChartSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    if (!eventId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('dietary_chart_settings')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          sort_by: updatedSettings.sortBy,
          font_size: updatedSettings.fontSize,
          show_mobile: updatedSettings.showMobile,
          show_relation: updatedSettings.showRelation,
          show_seat_no: updatedSettings.showSeatNo,
          show_logo: updatedSettings.showLogo,
          paper_size: updatedSettings.paperSize,
          is_bold: updatedSettings.isBold,
          is_italic: updatedSettings.isItalic,
          is_underline: updatedSettings.isUnderline,
        } as any, {
          onConflict: 'event_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving dietary chart settings:', error);
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
