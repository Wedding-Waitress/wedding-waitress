/**
 * Event Data Management Hook with Ceremony & Reception Support
 * 
 * Handles fetching, creating, updating, and deleting events
 * with full ceremony and reception field support.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

export interface Event {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  venue_address?: string | null;
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
  slug: string | null;
  rsvp_deadline: string | null;
  relation_allow_single_partner: boolean | null;
  relation_mode?: 'two' | 'single' | 'off' | null;
  event_type?: 'seated' | 'cocktail';
  // Ceremony fields
  ceremony_enabled?: boolean;
  ceremony_name?: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_venue_address?: string | null;
  ceremony_guest_limit?: number | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
  ceremony_rsvp_deadline?: string | null;
  reception_enabled?: boolean;
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
      
      // Fetch events with guest count AND additional fields in parallel
      const [{ data, error }, { data: fullEvents, error: fullErr }] = await Promise.all([
        supabase.rpc('get_events_with_guest_count'),
        supabase.from('events').select(`
          id, relation_mode, 
          ceremony_enabled, ceremony_name, ceremony_date, ceremony_venue, 
          ceremony_venue_address, ceremony_venue_phone, ceremony_venue_contact,
          ceremony_guest_limit, ceremony_start_time, 
          ceremony_finish_time, ceremony_rsvp_deadline, reception_enabled,
          venue_address, venue_phone, venue_contact
        `),
      ]);
      
      if (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "destructive",
        });
        return;
      }

      // Build a map of additional event data
      const eventDataMap = new Map((fullEvents || []).map((e: any) => [e.id, e]));

      setEvents((data || []).map((event: any) => {
        const extraData = eventDataMap.get(event.id) || {};
        return {
          ...event,
          partner1_name: event.partner1_name || null,
          partner2_name: event.partner2_name || null,
          rsvp_deadline: event.rsvp_deadline || null,
          relation_mode: extraData.relation_mode ?? event.relation_mode ?? null,
          ceremony_enabled: extraData.ceremony_enabled ?? false,
          ceremony_name: extraData.ceremony_name ?? null,
          ceremony_date: extraData.ceremony_date ?? null,
          ceremony_venue: extraData.ceremony_venue ?? null,
          ceremony_venue_address: extraData.ceremony_venue_address ?? null,
          ceremony_venue_phone: extraData.ceremony_venue_phone ?? null,
          ceremony_venue_contact: extraData.ceremony_venue_contact ?? null,
          ceremony_guest_limit: extraData.ceremony_guest_limit ?? null,
          ceremony_start_time: extraData.ceremony_start_time ?? null,
          ceremony_finish_time: extraData.ceremony_finish_time ?? null,
          ceremony_rsvp_deadline: extraData.ceremony_rsvp_deadline ?? null,
          reception_enabled: extraData.reception_enabled ?? true,
          venue_address: extraData.venue_address ?? null,
          venue_phone: extraData.venue_phone ?? null,
          venue_contact: extraData.venue_contact ?? null,
        };
      }));
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

      // Validate relation_mode before inserting (must be 'two', 'single', or 'off')
      const relationMode = (eventData as any).relation_mode || 'two';
      if (!['two', 'single', 'off'].includes(relationMode)) {
        console.warn(`Invalid relation_mode "${relationMode}", defaulting to "two"`);
      }

      const { data, error } = await supabase
        .from('events')
        .insert([{
          // Reception/main event fields
          name: eventData.name || '',
          date: eventData.date,
          venue: eventData.venue,
          start_time: eventData.start_time,
          finish_time: eventData.finish_time,
          guest_limit: eventData.guest_limit || 50,
          user_id: user.user.id,
          created_date_local: localDateString,
          expiry_date_local: expiryDateString,
          event_timezone: timezone,
          rsvp_deadline: eventData.rsvp_deadline || null,
          event_type: (eventData as any).event_type || 'seated',
          relation_mode: ['two', 'single', 'off'].includes(relationMode) ? relationMode : 'two',
          qr_apply_to_live_view: true,
          // Ceremony fields
          ceremony_enabled: (eventData as any).ceremony_enabled ?? false,
          ceremony_name: (eventData as any).ceremony_name || null,
          ceremony_date: (eventData as any).ceremony_date || null,
          ceremony_venue: (eventData as any).ceremony_venue || null,
          ceremony_venue_address: (eventData as any).ceremony_venue_address || null,
          ceremony_venue_phone: (eventData as any).ceremony_venue_phone || null,
          ceremony_venue_contact: (eventData as any).ceremony_venue_contact || null,
          ceremony_guest_limit: (eventData as any).ceremony_guest_limit || null,
          ceremony_start_time: (eventData as any).ceremony_start_time || null,
          ceremony_finish_time: (eventData as any).ceremony_finish_time || null,
          ceremony_rsvp_deadline: (eventData as any).ceremony_rsvp_deadline || null,
          reception_enabled: (eventData as any).reception_enabled ?? true,
          // Reception venue details
          venue_address: (eventData as any).venue_address || null,
          venue_phone: (eventData as any).venue_phone || null,
          venue_contact: (eventData as any).venue_contact || null,
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
