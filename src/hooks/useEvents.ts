import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Event {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  guest_limit: number;
  created_at: string;
  guests_count: number;
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_events_with_guest_count');
      
      if (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert([{
          name: eventData.name || '',
          date: eventData.date,
          venue: eventData.venue,
          start_time: eventData.start_time,
          finish_time: eventData.finish_time,
          guest_limit: eventData.guest_limit || 50,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchEvents();
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'guests_count'>>) => {
    try {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id);

      if (error) throw error;

      await fetchEvents();
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchEvents();
      if (activeEventId === id) {
        setActiveEventId(null);
      }
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    activeEventId,
    setActiveEventId,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};