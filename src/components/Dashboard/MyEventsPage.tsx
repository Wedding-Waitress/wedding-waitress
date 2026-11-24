/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Event Countdown System feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break real-time countdown updates
 * - Changes could break event selection persistence
 * - Changes could break profile synchronization
 * - Changes could break session storage initialization
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { EventsTable } from './EventsTable';
import { Event } from '@/hooks/useEvents';
import type { EventLimitsState } from '@/hooks/useEventLimits';
import { useEventLimits } from '@/hooks/useEventLimits';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { SeoHead } from '@/components/SEO/SeoHead';
import { Timer, CalendarDays } from 'lucide-react';
import { MyEventsSummaryCard } from './MyEventsSummaryCard';
import styles from './MyEventsPage.module.css';
import { PlanUpgradeStatus } from '@/components/Subscription/PlanUpgradeStatus';
import { MyEventsHeroLayout } from './MyEventsHeroLayout';
import {calculateCustomerTimeRemaining} from '@/lib/customerEventCountdown';
import {CustomerCountdownCircle} from './CustomerCountdownCircle';

interface MyEventsPageProps {
  events: Event[];
  loading: boolean;
  activeEventId: string | null;
  setActiveEventId: (eventId: string | null) => Promise<void> | void;
  createEvent: (eventData: any) => Promise<any>;
  updateEvent: (id: string, eventData: any) => Promise<void>;
  deleteEvent: (id: string) => Promise<unknown>;
  onNavigateToTab: (tabId: string) => void;
}

export const MyEventsPage: React.FC<MyEventsPageProps> = ({
  events,
  loading,
  activeEventId,
  setActiveEventId,
  createEvent,
  updateEvent,
  deleteEvent,
}) => {
  const {
    profile,
    updateDisplayCountdownEvent
  } = useProfile();
  const eventLimits: EventLimitsState = useEventLimits();

  // A) Page state & data - simplified to use activeEventId as single source of truth
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countdownValues, setCountdownValues] = useState({
    months: 0,
    weeks: 0,
    hours: 0,
    seconds: 0
  });
  const [eventState, setEventState] = useState<'upcoming' | 'in_progress' | 'finished' | 'no_event'>('no_event');

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
  const calculateTimeRemaining = calculateCustomerTimeRemaining;
  const updateCountdown = (event: Event | null) => {
    const timeResult = calculateTimeRemaining(event);
    setCountdownValues({
      months: timeResult.months,
      weeks: timeResult.weeks,
      hours: timeResult.hours,
      seconds: timeResult.seconds
    });
    setEventState(timeResult.eventState as 'upcoming' | 'in_progress' | 'finished' | 'no_event');
  };

  // Initialize selectedEvent based on activeEventId
  useEffect(() => {
    if (!events.length) {
      setSelectedEvent(null);
      return;
    }

    // If activeEventId exists and is valid, use it
    if (activeEventId && eventMap[activeEventId]) {
      setSelectedEvent(eventMap[activeEventId]);
    } else {
      // Recover a missing or deleted countdown selection with the first remaining event.
      const firstEventId = events[0]?.id;
      if (firstEventId) {
        setSelectedEvent(eventMap[firstEventId]);
        setActiveEventId(firstEventId);
      }
    }
  }, [events, activeEventId, eventMap, setActiveEventId]);

  // E) Realtime sync for profile changes
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
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Guest';
  };
  const formatEventDate = (event: Event | null) => {
    if (!event?.date) return '';
    const eventDate = new Date(event.date);
    const dayOfWeek = eventDate.toLocaleDateString('en-US', {
      weekday: 'long'
    });
    const day = eventDate.getDate();
    const month = eventDate.toLocaleDateString('en-US', {
      month: 'long'
    });
    const year = eventDate.getFullYear();

    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };
    return `${dayOfWeek} ${day}${getOrdinalSuffix(day)}, ${month} ${year}`;
  };
  const formatTimeRange = (event: Event | null) => {
    if (!event?.start_time) return '';
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    const startTime = formatTime(event.start_time);
    const finishTime = event.finish_time ? formatTime(event.finish_time) : '';
    if (finishTime) {
      return `Start ${startTime} — Finish ${finishTime}`;
    }
    return `Start ${startTime}`;
  };

  // B) Handle radio change for countdown selection
  const handleCountdownEventSelect = (eventId: string) => {
    // Update state immediately
    setSelectedEvent(eventMap[eventId]);
    setActiveEventId(eventId); // This is now the single source of truth

    // Persist in background without blocking UI
    updateDisplayCountdownEvent(eventId).catch(console.error);
  };

  // D) Countdown Timer Component with proper lifecycle
  const CountdownTimer: React.FC<{
    eventId: string | null;
  }> = ({
    eventId
  }) => {
    const [localCountdownValues, setLocalCountdownValues] = useState({
      months: 0,
      weeks: 0,
      hours: 0,
      seconds: 0
    });
    const [localEventState, setLocalEventState] = useState<'upcoming' | 'in_progress' | 'finished' | 'no_event'>('no_event');
    const updateLocalCountdown = (event: Event | null) => {
      const timeResult = calculateTimeRemaining(event);
      setLocalCountdownValues({
        months: timeResult.months,
        weeks: timeResult.weeks,
        hours: timeResult.hours,
        seconds: timeResult.seconds
      });
      setLocalEventState(timeResult.eventState as 'upcoming' | 'in_progress' | 'finished' | 'no_event');
    };

    // Update countdown immediately when event changes
    useEffect(() => {
      const currentEvent = eventId ? eventMap[eventId] : null;
      updateLocalCountdown(currentEvent);
    }, [eventId, eventMap]);

    // Timer that ticks every 1000ms
    useEffect(() => {
      const currentEvent = eventId ? eventMap[eventId] : null;
      if (!currentEvent) return;
      const interval = setInterval(() => {
        updateLocalCountdown(currentEvent);
      }, 1000);
      return () => clearInterval(interval);
    }, [eventId, eventMap]);
    return <div className={`transition-opacity duration-300 ease-in-out ${styles.countdownTimer}`}>
        {/* Event state message */}
        <div className={styles.countdownIntro}>
          <p data-ww-heading={localEventState === 'finished' ? undefined : ''} className={`text-muted-foreground text-lg ${styles.countdownMessage}`}>
            <span className="inline-flex items-center justify-center gap-2">
              <Timer size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              {localEventState === 'in_progress' ? "Your event is in progress" : localEventState === 'finished' ? <span className="text-sm text-muted-foreground">Event finished</span> : "Your event details & countdown timer"}
            </span>
          </p>
          {selectedEvent && (
            <p data-ww-heading className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight ${styles.eventTitle}`}>
              {selectedEvent.name}
            </p>
          )}
        </div>

        {selectedEvent ? <div className={styles.countdownCircles}>
            <CountdownCircle key={`months-${localCountdownValues.months}`} value={localCountdownValues.months} label="Months" type="months" />
            <CountdownCircle key={`weeks-${localCountdownValues.weeks}`} value={localCountdownValues.weeks} label="Weeks" type="weeks" />
            <CountdownCircle key={`hours-${localCountdownValues.hours}`} value={localCountdownValues.hours} label="Hours" type="hours" />
            <CountdownCircle key={`seconds-${localCountdownValues.seconds}`} value={localCountdownValues.seconds} label="Seconds" type="seconds" />
          </div> : <div className="space-y-4">
            <div className={styles.countdownCircles}>
              <CountdownCircle value="--" label="Months" type="months" />
              <CountdownCircle value="--" label="Weeks" type="weeks" />
              <CountdownCircle value="--" label="Hours" type="hours" />
              <CountdownCircle value="--" label="Seconds" type="seconds" />
            </div>
            <p className={`text-sm text-muted-foreground ${styles.supportingText}`}>
              {events.length === 0 ? "Create an event to start your countdown" : <button className="underline hover:text-primary transition-colors" onClick={() => {
            const firstEventId = events[0]?.id;
            if (firstEventId) {
              handleCountdownEventSelect(firstEventId);
            }
          }}>
                    Select an event below to start your countdown
                  </button>}
            </p>
          </div>}
      </div>;
  };
  const CountdownCircle = CustomerCountdownCircle;
  // Helper to format date for ceremony/reception boxes
  const formatBoxDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper to format time range for boxes
  const formatBoxTime = (startTime: string | null, finishTime: string | null) => {
    if (!startTime) return 'TBD';
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    const start = formatTime(startTime);
    const finish = finishTime ? formatTime(finishTime) : null;
    return finish ? `${start} - ${finish}` : start;
  };

  const hasCeremony = selectedEvent?.ceremony_enabled;
  const hasReception = Boolean(selectedEvent && selectedEvent.reception_enabled !== false); // Default to true for legacy events

  return <div className={`space-y-4 sm:space-y-6 ${styles.page}`}>
      <SeoHead
        title="Manage Your Wedding Events | Wedding Waitress"
        description="Effortlessly organize all your wedding events in one place—track guest lists, seating, and more with Wedding Waitress."
        noIndex
      />
      {/* Countdown Section */}
      <Card className={`border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] p-4 sm:p-5 mx-0 ${styles.countdownPanel}`}>
        <h1 className={styles.pageHeading}><CalendarDays size={25} strokeWidth={1.8} aria-hidden="true" />My Events</h1>
        <MyEventsHeroLayout
          hasCeremony={Boolean(hasCeremony)}
          hasReception={Boolean(hasReception)}
          countdown={<CountdownTimer key={activeEventId} eventId={activeEventId} />}
          ceremony={selectedEvent && hasCeremony ? <MyEventsSummaryCard kind="ceremony" values={{
            name: selectedEvent.ceremony_name || 'Not set',
            date: formatBoxDate(selectedEvent.ceremony_date),
            location: selectedEvent.ceremony_venue ? selectedEvent.ceremony_venue + (selectedEvent.ceremony_venue_address ? ' - ' + selectedEvent.ceremony_venue_address : '') : 'TBD',
            time: (selectedEvent.ceremony_start_time ? formatBoxTime(selectedEvent.ceremony_start_time, null) : 'TBD') + ' — ' + (selectedEvent.ceremony_finish_time ? formatBoxTime(selectedEvent.ceremony_finish_time, null) : 'TBD'),
            guests: selectedEvent.ceremony_guest_limit || 'Not set',
          }}/> : null}
          reception={selectedEvent && hasReception ? <MyEventsSummaryCard kind="reception" values={{
            name: selectedEvent.name,
            date: formatBoxDate(selectedEvent.date),
            location: selectedEvent.venue ? selectedEvent.venue + (selectedEvent.venue_address ? ' - ' + selectedEvent.venue_address : '') : 'TBD',
            time: (selectedEvent.start_time ? formatBoxTime(selectedEvent.start_time, null) : 'TBD') + ' — ' + (selectedEvent.finish_time ? formatBoxTime(selectedEvent.finish_time, null) : 'TBD'),
            guests: selectedEvent.guest_limit || 'Not set',
          }}/> : null}
        />
      </Card>

      {/* Events Table with controlled radios */}
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
            selectedEvent={selectedEvent}
            eventLimits={eventLimits}
            refinedControls
            planControls={<PlanUpgradeStatus />}
          />
        </div>
    </div>;
};
