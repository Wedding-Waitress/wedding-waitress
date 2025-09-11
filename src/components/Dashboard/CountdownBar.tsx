import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Event } from '@/hooks/useEvents';

interface CountdownBarProps {
  selectedEvent: Event | null;
}

export const CountdownBar: React.FC<CountdownBarProps> = ({ selectedEvent }) => {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<Event | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateDaysRemaining = (event: Event | null) => {
    if (!event?.date) {
      return 0;
    }

    const eventDate = new Date(event.date);
    const today = new Date();
    
    // Set both dates to midnight for accurate day calculation
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const timeDiff = eventDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  };

  const updateCountdown = (event: Event | null) => {
    const newDaysRemaining = calculateDaysRemaining(event);
    setDaysRemaining(newDaysRemaining);
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
        
        // Fade out animation (150ms)
        setTimeout(() => {
          updateCountdown(newEvent);
          
          // Fade in animation (150ms) 
          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
          }, 150);
        }, 150);
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

  // Update countdown every hour to keep it current
  useEffect(() => {
    const interval = setInterval(() => {
      if (displayEvent) {
        const newDaysRemaining = calculateDaysRemaining(displayEvent);
        setDaysRemaining(newDaysRemaining);
      }
    }, 3600000);
    
    return () => clearInterval(interval);
  }, [displayEvent]);

  return (
    <Card variant="elevated" className="p-8 mb-6">
      <div className="text-center" aria-live="polite">
        <h2 className="text-3xl font-bold text-black mb-4">
          Days to go
        </h2>
        <div 
          className={`text-6xl font-bold text-purple-600 transition-opacity duration-150 ease-in-out ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {daysRemaining}
        </div>
        {displayEvent && (
          <p 
            className={`text-sm text-muted-foreground mt-2 transition-opacity duration-150 ease-in-out ${
              isAnimating ? 'opacity-0' : 'opacity-100'
            }`}
          >
            until {displayEvent.name}
          </p>
        )}
      </div>
    </Card>
  );
};
