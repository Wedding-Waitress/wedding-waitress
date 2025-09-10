import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Event } from '@/hooks/useEvents';

interface CountdownBarProps {
  selectedEvent: Event | null;
}

export const CountdownBar: React.FC<CountdownBarProps> = ({ selectedEvent }) => {
  const [countdownDisplay, setCountdownDisplay] = useState<string>('0 months • 0 weeks • 0 days • 0 hours');
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<Event | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateTimeRemaining = (event: Event | null) => {
    if (!event?.date) {
      return { display: '0 months • 0 weeks • 0 days • 0 hours', hasStarted: false };
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
      return { display: '0 months • 0 weeks • 0 days • 0 hours', hasStarted: true };
    }
    
    // Calculate time units
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.floor(totalDays / 30); // Approximate month
    
    // Calculate remaining units
    const months = totalMonths;
    const weeks = Math.floor((totalDays - (months * 30)) / 7);
    const days = totalDays - (months * 30) - (weeks * 7);
    const hours = totalHours - (totalDays * 24);
    
    // Format with pluralization and no leading zeros
    const monthText = months === 1 ? 'month' : 'months';
    const weekText = weeks === 1 ? 'week' : 'weeks';
    const dayText = days === 1 ? 'day' : 'days';
    const hourText = hours === 1 ? 'hour' : 'hours';
    
    const display = `${months} ${monthText} • ${weeks} ${weekText} • ${days} ${dayText} • ${hours} ${hourText}`;
    
    return { display, hasStarted: false };
  };

  const updateCountdown = (event: Event | null) => {
    const timeResult = calculateTimeRemaining(event);
    setCountdownDisplay(timeResult.display);
    setHasStarted(timeResult.hasStarted);
    setDisplayEvent(event);
  };

  const handleEventChange = (newEvent: Event | null) => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce rapid selection changes (150ms)
    debounceTimeoutRef.current = setTimeout(() => {
      if (!isAnimating && newEvent?.id !== displayEvent?.id) {
        setIsAnimating(true);
        
        // Fade out animation (125ms)
        setTimeout(() => {
          updateCountdown(newEvent);
          
          // Fade in animation (125ms) 
          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
          }, 125);
        }, 125);
      }
    }, 150);
  };

  useEffect(() => {
    handleEventChange(selectedEvent);
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [selectedEvent]);

  // Update countdown every minute to keep it current
  useEffect(() => {
    const interval = setInterval(() => {
      if (displayEvent) {
        const timeResult = calculateTimeRemaining(displayEvent);
        setCountdownDisplay(timeResult.display);
        setHasStarted(timeResult.hasStarted);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [displayEvent]);

  return (
    <Card variant="elevated" className="p-8 mb-6">
      <div className="text-center" aria-live="polite">
        <h2 className="text-3xl font-bold text-black mb-4">
          Time to go
        </h2>
        <div 
          className={`text-2xl font-bold text-purple-600 transition-opacity duration-125 ease-in-out ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {countdownDisplay}
        </div>
        {displayEvent && (
          <p 
            className={`text-sm text-muted-foreground mt-2 transition-opacity duration-125 ease-in-out ${
              isAnimating ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {hasStarted ? 'event has started' : `until ${displayEvent.name}`}
          </p>
        )}
      </div>
    </Card>
  );
};
