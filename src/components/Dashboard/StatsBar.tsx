import React from 'react';
import { Card } from "@/components/ui/enhanced-card";

interface Event {
  id: string;
  name: string;
  date: string | null;
}

interface StatsBarProps {
  selectedEvent?: Event | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ selectedEvent }) => {
  const calculateDaysToGo = (eventDate: string | null): number => {
    if (!eventDate) return 0;
    
    const today = new Date();
    const event = new Date(eventDate);
    const diffTime = event.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const daysToGo = selectedEvent ? calculateDaysToGo(selectedEvent.date) : 0;

  return (
    <Card variant="elevated" className="p-8 mb-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Days to go
        </h2>
        <div className="text-6xl font-bold text-primary">
          {daysToGo}
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