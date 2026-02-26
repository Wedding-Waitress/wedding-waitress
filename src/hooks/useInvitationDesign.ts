import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InvitationDesign {
  id: string;
  user_id: string;
  event_id: string;
  template_id: string;
  custom_text: Record<string, string>;
  custom_styles: Record<string, any>;
  include_guest_name: boolean;
  include_qr_code: boolean;
  qr_position: { x: number; y: number; size: number } | null;
  created_at: string;
  updated_at: string;
}

export const useInvitationDesign = (eventId: string | null) => {
  const [design, setDesign] = useState<InvitationDesign | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDesign = useCallback(async () => {
    if (!eventId) {
      setDesign(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitation_designs' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDesign(data as any);
    } catch (err: any) {
      console.error('Error fetching design:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDesign();
  }, [fetchDesign]);

  const saveDesign = async (designData: Partial<InvitationDesign>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !eventId) return null;

      if (design?.id) {
        const { error } = await supabase
          .from('invitation_designs' as any)
          .update({ ...designData, updated_at: new Date().toISOString() } as any)
          .eq('id', design.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invitation_designs' as any)
          .insert({
            ...designData,
            user_id: user.id,
            event_id: eventId,
          } as any);
        if (error) throw error;
      }
      await fetchDesign();
      toast({ title: 'Saved', description: 'Your invitation design has been saved.' });
      return true;
    } catch (err: any) {
      console.error('Error saving design:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save design', variant: 'destructive' });
      return null;
    }
  };

  return { design, loading, fetchDesign, saveDesign };
};
