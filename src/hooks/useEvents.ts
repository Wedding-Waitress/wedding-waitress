import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

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
  event_created: string;
  expiry_date: string;
  created_date_local: string | null;
  expiry_date_local: string | null;
  event_timezone: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile, updateDisplayCountdownEvent } = useProfile();

  const setActiveEventIdWithPersistence = async (eventId: string | null) => {
    setActiveEventId(eventId);
    await updateDisplayCountdownEvent(eventId);
  };

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

      setEvents((data || []).map(event => ({
        ...event,
        partner1_name: event.partner1_name || null,
        partner2_name: event.partner2_name || null,
      })));
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

      // Get browser timezone and calculate local dates
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date();
      const localDateString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Calculate expiry date (12 months from today)
      const expiryDate = new Date(today);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const expiryDateString = expiryDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      const { data, error } = await supabase
        .from('events')
        .insert([{
          name: eventData.name || '',
          date: eventData.date,
          venue: eventData.venue,
          start_time: eventData.start_time,
          finish_time: eventData.finish_time,
          guest_limit: eventData.guest_limit || 50,
          user_id: user.user.id,
          created_date_local: localDateString,
          expiry_date_local: expiryDateString,
          event_timezone: timezone
        }])
        .select()
        .single();

      if (error) throw error;

      // Set the newly created event as active immediately
      setActiveEventId(data.id);
      await updateDisplayCountdownEvent(data.id);
      
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
    let realtimeCleanup: (() => void) | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // If not authenticated, ensure we don't get stuck loading
      if (!user) {
        setEvents([]);
        setActiveEventId(null);
        setLoading(false);
        return;
      }

      // Initial fetch for authenticated users
      fetchEvents();

      // Set up realtime subscription for this user's events
      const channel = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch when any change occurs
            fetchEvents();
          }
        )
        .subscribe();

      realtimeCleanup = () => {
        supabase.removeChannel(channel);
      };
    };

    void init();

    // Auth listener: refetch on login, clear on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          fetchEvents();
        }, 0);
      } else {
        setEvents([]);
        setActiveEventId(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeCleanup) realtimeCleanup();
    };
  }, []);

  // Initialize activeEventId from profile or auto-select first event
  useEffect(() => {
    if (!profile || events.length === 0) return;
    
    // If profile has a saved display_countdown_event_id and it exists in events, use it
    if (profile.display_countdown_event_id) {
      const savedEvent = events.find(e => e.id === profile.display_countdown_event_id);
      if (savedEvent) {
        setActiveEventId(savedEvent.id);
        return;
      }
    }
    
    // Otherwise, auto-select first event and save it
    if (!activeEventId && events.length > 0) {
      const firstEvent = events[0];
      setActiveEventId(firstEvent.id);
      updateDisplayCountdownEvent(firstEvent.id);
    }
  }, [events, profile, activeEventId, updateDisplayCountdownEvent]);

  return {
    events,
    loading,
    activeEventId,
    setActiveEventId: setActiveEventIdWithPersistence,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};