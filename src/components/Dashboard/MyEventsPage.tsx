import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { EventsTable } from './EventsTable';
import { useEvents, Event } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export const MyEventsPage: React.FC = () => {
  const { events, loading, activeEventId, setActiveEventId, createEvent, updateEvent, deleteEvent } = useEvents();
  const { profile, updateDisplayCountdownEvent } = useProfile();
  
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
    const map: { [eventId: string]: Event } = {};
    events.forEach(event => {
      map[event.id] = event;
    });
    return map;
  }, [events]);

  const calculateTimeRemaining = (event: Event | null) => {
    if (!event?.date) {
      return {
        months: 0,
        weeks: 0,
        hours: 0,
        seconds: 0,
        eventState: 'no_event' as const,
        targetEnd: null
      };
    }

    const eventDate = new Date(event.date);
    
    // Calculate target start time
    const targetStart = new Date(eventDate);
    if (event.start_time) {
      const [hours, minutes] = event.start_time.split(':');
      targetStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      targetStart.setHours(0, 0, 0, 0);
    }

    // Calculate target end time
    let targetEnd: Date | null = null;
    if (event.finish_time) {
      targetEnd = new Date(eventDate);
      const [endHours, endMinutes] = event.finish_time.split(':');
      const endHour = parseInt(endHours);
      const endMinute = parseInt(endMinutes);
      
      // If finish time is before start time, assume it's next day
      const startHour = event.start_time ? parseInt(event.start_time.split(':')[0]) : 0;
      const startMinute = event.start_time ? parseInt(event.start_time.split(':')[1]) : 0;
      
      if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        targetEnd.setDate(targetEnd.getDate() + 1);
      }
      
      targetEnd.setHours(endHour, endMinute, 0, 0);
    }

    const now = new Date();
    
    // Determine event state and target time
    let targetTime: Date;
    let eventState: 'upcoming' | 'in_progress' | 'finished';
    
    if (now < targetStart) {
      // Event hasn't started yet
      targetTime = targetStart;
      eventState = 'upcoming';
    } else if (targetEnd && now < targetEnd) {
      // Event is in progress
      targetTime = targetEnd;
      eventState = 'in_progress';
    } else {
      // Event has finished or no end time
      eventState = 'finished';
      return {
        months: 0,
        weeks: 0,
        hours: 0,
        seconds: 0,
        eventState,
        targetEnd
      };
    }

    const timeDiff = targetTime.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return {
        months: 0,
        weeks: 0,
        hours: 0,
        seconds: 0,
        eventState: 'finished',
        targetEnd
      };
    }

    // Calculate time units
    const totalSeconds = Math.floor(timeDiff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.floor(totalDays / 30); // Approximate month

    // Calculate remaining units
    const months = totalMonths;
    const weeks = Math.floor((totalDays - months * 30) / 7);
    const hours = totalHours - totalDays * 24;
    const seconds = totalSeconds % 60;

    return {
      months,
      weeks,
      hours,
      seconds,
      eventState,
      targetEnd
    };
  };

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

  // E) Realtime sync for profile changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          const newDisplayEventId = payload.new?.display_countdown_event_id;
          if (newDisplayEventId && eventMap[newDisplayEventId] && newDisplayEventId !== activeEventId) {
            setSelectedEvent(eventMap[newDisplayEventId]);
            setActiveEventId(newDisplayEventId);
          }
        }
      )
      .subscribe();

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
    const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    const day = eventDate.getDate();
    const month = eventDate.toLocaleDateString('en-US', { month: 'long' });
    const year = eventDate.getFullYear();
    
    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
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

  const getProgressPercentage = (value: number, max: number, type: string) => {
    const now = new Date();
    
    switch (type) {
      case 'months':
        // Progress within current month
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return (dayOfMonth / daysInMonth) * 100;
      
      case 'weeks':
        // Progress within current week
        const dayOfWeek = now.getDay();
        return (dayOfWeek / 7) * 100;
      
      case 'hours':
        // Progress within current hour
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        return ((minutes * 60 + seconds) / 3600) * 100;
      
      case 'seconds':
        // Progress within current minute
        return (now.getSeconds() / 60) * 100;
      
      default:
        return 0;
    }
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
  const CountdownTimer: React.FC<{ eventId: string | null }> = ({ eventId }) => {
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

    return (
      <div className="transition-opacity duration-300 ease-in-out">
        {selectedEvent ? (
          <div className="flex justify-center items-center gap-8 md:gap-16 flex-wrap">
            <CountdownCircle value={localCountdownValues.months} label="Months" type="months" />
            <CountdownCircle value={localCountdownValues.weeks} label="Weeks" type="weeks" />
            <CountdownCircle value={localCountdownValues.hours} label="Hours" type="hours" />
            <CountdownCircle value={localCountdownValues.seconds} label="Seconds" type="seconds" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-8 md:gap-16 flex-wrap">
              <CountdownCircle value="--" label="Months" type="months" />
              <CountdownCircle value="--" label="Weeks" type="weeks" />
              <CountdownCircle value="--" label="Hours" type="hours" />
              <CountdownCircle value="--" label="Seconds" type="seconds" />
            </div>
            <p className="text-sm text-muted-foreground">
              {events.length === 0 
                ? "Create an event to start your countdown" 
                : (
                  <button 
                    className="underline hover:text-primary transition-colors"
                    onClick={() => {
                      const firstEventId = events[0]?.id;
                      if (firstEventId) {
                        handleCountdownEventSelect(firstEventId);
                      }
                    }}
                  >
                    Select an event below to start your countdown
                  </button>
                )
              }
            </p>
          </div>
        )}
        
        {/* Event state message */}
        <div className="text-center mt-4">
          <p className="text-muted-foreground text-lg">
            {localEventState === 'in_progress' 
              ? "Your event is in progress"
              : localEventState === 'finished'
              ? <span className="text-sm text-muted-foreground">Event finished</span>
              : "This is a countdown to your event"
            }
          </p>
        </div>
      </div>
    );
  };

  const CountdownCircle = ({ value, label, type }: { value: number | string; label: string; type: string }) => {
    const isPlaceholder = value === '--';
    const progress = isPlaceholder ? 0 : getProgressPercentage(Number(value), 100, type);
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-2">
          {/* SVG Ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Base ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            {/* Progress ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-out"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{value}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Countdown Section */}
      <Card className="p-8">
        <div className="text-center space-y-6">
          {/* Welcome Message */}
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              Welcome {getDisplayName()}
            </h2>
            {/* C) Countdown header binding - Event Date */}
            {selectedEvent && (
              <p className="text-muted-foreground transition-opacity duration-300 ease-in-out">
                {formatEventDate(selectedEvent)}
              </p>
            )}
          </div>

          {/* D) Countdown Circles with Timer lifecycle - use key for reset */}
          <CountdownTimer key={activeEventId} eventId={activeEventId} />

          {/* C) Event Name and Time Range binding */}
          {selectedEvent && (
            <div className="space-y-1 transition-opacity duration-300 ease-in-out">
              <p className="text-lg font-medium text-primary">
                {selectedEvent.name}
              </p>
              {formatTimeRange(selectedEvent) && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(selectedEvent)}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Events Table with controlled radios */}
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
  );
};