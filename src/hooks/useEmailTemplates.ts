import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailTemplate {
  id: string;
  user_id: string;
  event_id: string | null;
  template_name: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

interface SaveTemplateData {
  template_name: string;
  subject: string;
  html_body: string;
  event_id?: string | null;
}

export const useEmailTemplates = (eventId: string | null) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (templateData: SaveTemplateData): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('email_templates')
        .insert({
          user_id: user.id,
          event_id: templateData.event_id || null,
          template_name: templateData.template_name,
          subject: templateData.subject,
          html_body: templateData.html_body,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateTemplate = async (templateId: string, updates: Partial<SaveTemplateData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Failed to update template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
      return false;
    }
  };

  const duplicateTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      return await saveTemplate({
        template_name: `Copy of ${template.template_name}`,
        subject: template.subject,
        html_body: template.html_body,
        event_id: template.event_id,
      });
    } catch (error: any) {
      console.error('Failed to duplicate template:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
};
