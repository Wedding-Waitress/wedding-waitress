import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Event } from '@/hooks/useEvents';
import { useProfile } from '@/hooks/useProfile';
interface CountdownBarProps {
  selectedEvent: Event | null;
}
export const CountdownBar: React.FC<CountdownBarProps> = ({
  selectedEvent
}) => {
  const [countdownValues, setCountdownValues] = useState({
    months: 0,
    weeks: 0,
    hours: 0,
    seconds: 0
  });
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<Event | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const {
    profile
  } = useProfile();
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

  // Update countdown every second for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (displayEvent) {
        const timeResult = calculateTimeRemaining(displayEvent);
        setCountdownValues({
          months: timeResult.months,
          weeks: timeResult.weeks,
          hours: timeResult.hours,
          seconds: timeResult.seconds
        });
        setHasStarted(timeResult.hasStarted);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [displayEvent]);
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Guest';
  };
  const CountdownCircle = ({
    value,
    label
  }: {
    value: number;
    label: string;
  }) => <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 md:w-32 md:h-32 mb-2">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-hover shadow-lg border-2 border-white/20"></div>
        <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/30"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white text-center md:text-7xl">{value}</span>
        </div>
      </div>
      <span className="text-sm md:text-base font-medium text-foreground/80">{label}</span>
    </div>;
  return <Card variant="elevated" className="p-8 mb-6 mx-auto max-w-4xl">
      <div className="text-center space-y-6" aria-live="polite">
        {/* Welcome Message */}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome <span className="gradient-text">{getDisplayName()}</span>
          </h2>
          <p className="text-muted-foreground text-xl">This is the countdown to your event</p>
        </div>

        {/* Countdown Circles */}
        <div className={`transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {displayEvent ? <div className="flex justify-center items-center gap-6 md:gap-12 flex-wrap">
              <CountdownCircle value={countdownValues.months} label="Months" />
              <CountdownCircle value={countdownValues.weeks} label="Weeks" />
              <CountdownCircle value={countdownValues.hours} label="Hours" />
              <CountdownCircle value={countdownValues.seconds} label="Seconds" />
            </div> : <div className="flex justify-center items-center gap-6 md:gap-12 flex-wrap">
              <CountdownCircle value={0} label="Months" />
              <CountdownCircle value={0} label="Weeks" />
              <CountdownCircle value={0} label="Hours" />
              <CountdownCircle value={0} label="Seconds" />
            </div>}
        </div>

        {/* Event Status */}
        {displayEvent && <p className={`text-lg font-medium text-muted-foreground transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {hasStarted ? 'Event has started!' : `Until ${displayEvent.name}`}
          </p>}
      </div>
    </Card>;
};