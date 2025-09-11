import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { EventsTable } from './EventsTable';
import { useEvents, Event } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';

export const MyEventsPage: React.FC = () => {
  const { events, activeEventId } = useEvents();
  const { profile } = useProfile();
  
  const [countdownValues, setCountdownValues] = useState({
    months: 0,
    weeks: 0,
    hours: 0,
    seconds: 0
  });
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Get the selected event for countdown
  const selectedEvent = activeEventId ? events.find(e => e.id === activeEventId) : null;

  const calculateTimeRemaining = (event: Event | null) => {
    if (!event?.date) {
      return {
        months: 0,
        weeks: 0,
        hours: 0,
        seconds: 0,
        hasStarted: false
      };
    }

    const eventDate = new Date(event.date);
    
    // If start_time is available, use it; otherwise use 00:00
    if (event.start_time) {
      const [hours, minutes] = event.start_time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      eventDate.setHours(0, 0, 0, 0);
    }

    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return {
        months: 0,
        weeks: 0,
        hours: 0,
        seconds: 0,
        hasStarted: true
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
      hasStarted: false
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
    setHasStarted(timeResult.hasStarted);
  };

  const handleEventChange = (newEvent: Event | null) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isAnimating) {
        setIsAnimating(true);
        
        setTimeout(() => {
          updateCountdown(newEvent);
          
          setTimeout(() => {
            setIsAnimating(false);
          }, 200);
        }, 200);
      }
    }, 100);
  };

  // Handle event selection changes
  useEffect(() => {
    handleEventChange(selectedEvent);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedEvent?.id]);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedEvent) {
        const timeResult = calculateTimeRemaining(selectedEvent);
        setCountdownValues({
          months: timeResult.months,
          weeks: timeResult.weeks,
          hours: timeResult.hours,
          seconds: timeResult.seconds
        });
        setHasStarted(timeResult.hasStarted);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedEvent]);

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
      <Card variant="elevated" className="p-8">
        <div className="text-center space-y-6">
          {/* Welcome Message */}
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              Welcome {getDisplayName()}
            </h2>
            <p className="text-muted-foreground text-lg">
              This is a countdown to your event
            </p>
            {/* Event Date */}
            {selectedEvent && (
              <p className={`text-muted-foreground transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                {formatEventDate(selectedEvent)}
              </p>
            )}
          </div>

          {/* Countdown Circles */}
          <div className={`transition-opacity duration-400 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {selectedEvent ? (
              <div className="flex justify-center items-center gap-8 md:gap-16 flex-wrap">
                <CountdownCircle value={countdownValues.months} label="Months" type="months" />
                <CountdownCircle value={countdownValues.weeks} label="Weeks" type="weeks" />
                <CountdownCircle value={countdownValues.hours} label="Hours" type="hours" />
                <CountdownCircle value={countdownValues.seconds} label="Seconds" type="seconds" />
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
                  <button className="underline hover:text-primary transition-colors">
                    Select an event below to start your countdown
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Event Name */}
          {selectedEvent && (
            <p className={`text-lg font-medium text-primary transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              {selectedEvent.name}
            </p>
          )}
        </div>
      </Card>

      {/* Events Table */}
      <EventsTable />
    </div>
  );
};