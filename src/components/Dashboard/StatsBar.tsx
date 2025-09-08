import React from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { 
  Table, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
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
    tables: number;
    totalSeats: number;
    assigned: number;
    unassigned: number;
    filledPercentage: number;
    remaining: number;
    tablesAtCapacity: number;
    guestLimit: number;
  };
}

export const StatsBar: React.FC<StatsBarProps> = ({ 
  stats = {
    tables: 5,
    totalSeats: 42,
    assigned: 10,
    unassigned: 0,
    filledPercentage: 24,
    remaining: 32,
    tablesAtCapacity: 1,
    guestLimit: 80
  }
}) => {
  const statItems: StatItem[] = [
    {
      label: "Tables",
      value: stats.tables,
      icon: <Table className="w-4 h-4" />,
      color: "text-primary"
    },
    {
      label: "Total Seats",
      value: stats.totalSeats,
      icon: <Users className="w-4 h-4" />,
      color: "text-blue-600"
    },
    {
      label: "Assigned",
      value: stats.assigned,
      icon: <UserCheck className="w-4 h-4" />,
      color: "text-success"
    },
    {
      label: "Unassigned",
      value: stats.unassigned,
      icon: <UserX className="w-4 h-4" />,
      color: "text-warning"
    },
    {
      label: "Filled (%)",
      value: `${stats.filledPercentage}%`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-primary"
    },
    {
      label: "Remaining",
      value: stats.remaining,
      icon: <Clock className="w-4 h-4" />,
      color: "text-muted-foreground"
    },
    {
      label: "Tables at Capacity",
      value: stats.tablesAtCapacity,
      icon: <Target className="w-4 h-4" />,
      color: "text-success"
    },
    {
      label: "Guest Limit",
      value: stats.guestLimit,
      icon: <Zap className="w-4 h-4" />,
      color: "text-destructive"
    }
  ];

  return (
    <Card variant="elevated" className="p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 min-w-0">
            <div className={`flex-shrink-0 ${item.color}`}>
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">
                {item.label}
              </p>
              <p className={`text-sm font-semibold ${item.color}`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};