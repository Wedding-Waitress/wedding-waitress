import React, { useState, useEffect, useMemo } from 'react';
import { EventsTable } from './EventsTable';
import { useEvents, Event } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export const MyEventsPage: React.FC = () => {
  const {
    events,
    loading,
    activeEventId,
    setActiveEventId,
    createEvent,
    updateEvent,
    deleteEvent
  } = useEvents();
  const {
    profile,
    updateDisplayCountdownEvent
  } = useProfile();

  // Page state - simplified to use activeEventId as single source of truth
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Build eventMap from events data
  const eventMap = useMemo(() => {
    const map: {
      [eventId: string]: Event;
    } = {};
    events.forEach(event => {
      map[event.id] = event;
    });
    return map;
  }, [events]);

  // Initialize selectedEvent based on activeEventId
  useEffect(() => {
    if (!events.length) return;

    // If activeEventId exists and is valid, use it
    if (activeEventId && eventMap[activeEventId]) {
      setSelectedEvent(eventMap[activeEventId]);
    } else if (!activeEventId) {
      // Set to first event if no active event
      const firstEventId = events[0]?.id;
      if (firstEventId) {
        setSelectedEvent(eventMap[firstEventId]);
        setActiveEventId(firstEventId);
      }
    }
  }, [events, activeEventId, eventMap, setActiveEventId]);

  // Realtime sync for profile changes
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel('profile-changes').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${profile.id}`
    }, payload => {
      const newDisplayEventId = payload.new?.display_countdown_event_id;
      if (newDisplayEventId && eventMap[newDisplayEventId] && newDisplayEventId !== activeEventId) {
        setSelectedEvent(eventMap[newDisplayEventId]);
        setActiveEventId(newDisplayEventId);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, eventMap, activeEventId, setActiveEventId]);

  // Handle radio change for countdown selection
  const handleCountdownEventSelect = (eventId: string) => {
    // Update state immediately
    setSelectedEvent(eventMap[eventId]);
    setActiveEventId(eventId); // This is now the single source of truth

    // Persist in background without blocking UI
    updateDisplayCountdownEvent(eventId).catch(console.error);
  };

  return <div className="space-y-6">
      {/* Events Table with embedded countdown in header */}
      <div className="overflow-x-auto">
        <EventsTable 
          events={events} 
          loading={loading} 
          activeEventId={activeEventId} 
          setActiveEventId={setActiveEventId} 
          createEvent={createEvent} 
          updateEvent={updateEvent} 
          deleteEvent={deleteEvent} 
          onEventSelect={handleCountdownEventSelect} 
        />
      </div>
    </div>;
};
