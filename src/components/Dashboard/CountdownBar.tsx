import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Event } from '@/hooks/useEvents';

interface CountdownBarProps {
  selectedEvent: Event | null;
}

export const CountdownBar: React.FC<CountdownBarProps> = ({ selectedEvent }) => {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateDaysRemaining = () => {
      if (!selectedEvent?.date) {
        setDaysRemaining(0);
        return;
      }

      const eventDate = new Date(selectedEvent.date);
      const today = new Date();
      
      // Set both dates to midnight for accurate day calculation
      eventDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      setDaysRemaining(Math.max(0, daysDiff));
    };

    calculateDaysRemaining();
    
    // Update every hour to keep countdown current
    const interval = setInterval(calculateDaysRemaining, 3600000);
    
    return () => clearInterval(interval);
  }, [selectedEvent?.date]);

  return (
    <Card variant="elevated" className="p-8 mb-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-black mb-4">
          Days to go
        </h2>
        <div className="text-6xl font-bold text-black">
          {daysRemaining}
        </div>
        {selectedEvent && (
          <p className="text-sm text-muted-foreground mt-2">
            until {selectedEvent.name}
          </p>
        )}
      </div>
    </Card>
  );
};
