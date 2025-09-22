import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  Table, 
  Users, 
  UserCheck, 
  Clock, 
  Target,
  Zap
} from "lucide-react";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface StatsBarProps {
  stats?: {
    tablesCreated: number;
    seatsCreated: number;
    seatsFilled: number;
    seatsRemaining: number;
    eventGuestLimit: number;
    tablesAtCapacity: number;
  };
}

export const StatsBar: React.FC<StatsBarProps> = ({ 
  stats = {
    tablesCreated: 0,
    seatsCreated: 0,
    seatsFilled: 0,
    seatsRemaining: 0,
    eventGuestLimit: 0,
    tablesAtCapacity: 0
  }
}) => {
  const statItems: StatItem[] = [
    {
      label: "Tables Created",
      value: stats.tablesCreated,
      icon: <Table className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Seats Created",
      value: stats.seatsCreated,
      icon: <Users className="w-6 h-6" />,
      color: "text-blue-600"
    },
    {
      label: "Seats Filled",
      value: stats.seatsFilled,
      icon: <UserCheck className="w-6 h-6" />,
      color: "text-success"
    },
    {
      label: "Seats Remaining",
      value: stats.seatsRemaining,
      icon: <Clock className="w-6 h-6" />,
      color: "text-muted-foreground"
    },
    {
      label: "Event Guest Limit",
      value: stats.eventGuestLimit,
      icon: <Zap className="w-6 h-6" />,
      color: "text-destructive"
    },
    {
      label: "Tables Reached Capacity",
      value: stats.tablesAtCapacity,
      icon: <Target className="w-6 h-6" />,
      color: "text-success"
    }
  ];

  return (
    <Card className="mb-6 border-2 border-primary shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="flex flex-col items-center text-center space-y-2 min-w-0">
            <div className={`flex-shrink-0 ${item.color}`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {item.label}
              </p>
              <p className={`text-lg font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};