import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TextZone {
  id: string;
  label: string;
  type: 'auto' | 'custom' | 'guest_name';
  auto_field?: 'couple_names' | 'date' | 'venue' | 'time' | null;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  max_lines: number;
  default_text: string;
  font_family: string;
  font_size: number;
  font_weight: string;
  font_color: string;
  text_align: string;
  letter_spacing: number;
}

export type CardType = 'invitation' | 'save_the_date' | 'thank_you';

export interface InvitationTemplate {
  id: string;
  name: string;
  card_type: CardType;
  category: string;
  orientation: string;
  width_mm: number;
  height_mm: number;
  background_url: string;
  thumbnail_url: string | null;
  text_zones: TextZone[];
  default_styles: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const useInvitationTemplates = (cardType?: CardType) => {
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invitation_templates' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (cardType) {
        query = query.eq('card_type', cardType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data as any[] || []).map(t => ({
        ...t,
        text_zones: (t.text_zones || []) as TextZone[],
        default_styles: (t.default_styles || {}) as Record<string, any>,
      })));
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, cardType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (template: Partial<InvitationTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('invitation_templates' as any)
        .insert(template as any)
        .select()
        .single();
      if (error) throw error;
      await fetchTemplates();
      return data;
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create template', variant: 'destructive' });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<InvitationTemplate>) => {
    try {
      const { error } = await supabase
        .from('invitation_templates' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error updating template:', err);
      toast({ title: 'Error', description: err.message || 'Failed to update template', variant: 'destructive' });
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitation_templates' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete template', variant: 'destructive' });
      return false;
    }
  };

  return { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
};
