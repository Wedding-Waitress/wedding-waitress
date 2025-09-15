import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Guest {
  id: string;
  event_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  table_id: string | null;
  table_no: number | null;
  seat_no: number | null;
  assigned: boolean;
  rsvp: string;
  dietary: string;
  mobile: string | null;
  email: string | null;
  notes: string | null;
  who_is_partner: string;
  who_is_role: string;
  who_is_display: string;
  created_at: string;
  display_order: number | null;
  family_group: string | null;
}

export const useGuests = (eventId: string | null) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGuests = async () => {
    if (!eventId) {
      setGuests([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching guests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch guests",
          variant: "destructive",
        });
        return;
      }

      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteGuest = async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) {
        console.error('Error deleting guest:', error);
        toast({
          title: "Error",
          description: "Failed to delete guest",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Guest deleted successfully",
      });

      // Remove the deleted guest from state
      setGuests(prevGuests => prevGuests.filter(guest => guest.id !== guestId));
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateGuest = async (guestId: string, guestData: Partial<Guest>) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update(guestData)
        .eq('id', guestId);

      if (error) {
        console.error('Error updating guest:', error);
        toast({
          title: "Error",
          description: "Failed to update guest",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Guest updated successfully",
      });

      // Refresh guests to get updated data
      await fetchGuests();
      return true;
    } catch (error) {
      console.error('Error updating guest:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [eventId]);

  return {
    guests,
    loading,
    fetchGuests,
    deleteGuest,
    updateGuest,
  };
};