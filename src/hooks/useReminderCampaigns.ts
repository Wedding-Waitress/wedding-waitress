import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReminderCampaign {
  id: string;
  event_id: string;
  name: string;
  target_status: string[] | null;
  message_template: string;
  delivery_method: string;
  status: string | null;
  scheduled_for: string | null;
  sent_count: number | null;
  total_count: number | null;
  created_at: string | null;
  user_id: string;
}

export const useReminderCampaigns = (eventId: string | null) => {
  const [campaigns, setCampaigns] = useState<ReminderCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rsvp_reminder_campaigns')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('rsvp_reminder_campaigns')
        .insert([{ ...campaignData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Campaign created successfully'
      });
      
      fetchCampaigns();
      return data;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive'
      });
      return null;
    }
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-reminders', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;

      toast({
        title: 'Reminders Sent',
        description: `Successfully sent ${data.sent_count} reminders`
      });
      
      fetchCampaigns();
      return data;
    } catch (error) {
      console.error('Failed to send campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminders',
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('rsvp_reminder_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Campaign deleted'
      });
      
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [eventId]);

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    sendCampaign,
    deleteCampaign
  };
};
