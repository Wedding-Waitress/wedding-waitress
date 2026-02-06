import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  Table, 
  Users, 
  UserCheck, 
  Clock, 
  Target,
  Zap,
  Mail,
  CheckCircle2,
  AlertCircle
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
    sentInvites: number;
    unsentInvites: number;
    respondedInvites: number;
    unrespondedInvites: number;
  };
}

export const StatsBar: React.FC<StatsBarProps> = ({ 
  stats = {
    tablesCreated: 0,
    seatsCreated: 0,
    seatsFilled: 0,
    seatsRemaining: 0,
    eventGuestLimit: 0,
    tablesAtCapacity: 0,
    sentInvites: 0,
    unsentInvites: 0,
    respondedInvites: 0,
    unrespondedInvites: 0
  }
}) => {
  const statItems: StatItem[] = [
    {
      label: "Guest Limit",
      value: stats.eventGuestLimit,
      icon: <Zap className="w-6 h-6" />,
      color: "text-destructive"
    },
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
      color: "text-green-500"
    },
    {
      label: "Seats Remaining",
      value: stats.seatsRemaining,
      icon: <Clock className="w-6 h-6" />,
      color: "text-orange-500"
    },
    {
      label: "Full Tables",
      value: stats.tablesAtCapacity,
      icon: <Target className="w-6 h-6" />,
      color: "text-green-500"
    },
    {
      label: "Sent Invites",
      value: stats.sentInvites,
      icon: <Mail className="w-6 h-6" />,
      color: "text-blue-600"
    },
    {
      label: "Unsent Invites",
      value: stats.unsentInvites,
      icon: <Clock className="w-6 h-6" />,
      color: "text-muted-foreground"
    },
    {
      label: "Replied Invites",
      value: stats.respondedInvites,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: "text-pink-500"
    },
    {
      label: "Unreplied Invites",
      value: stats.unrespondedInvites,
      icon: <AlertCircle className="w-6 h-6" />,
      color: "text-amber-600"
    }
  ];

  return (
    <Card className="mb-6 border-2 border-primary shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="p-3 sm:p-4 md:p-6">
        {/* Mobile: Horizontal scrollable row */}
        <div className="sm:hidden">
          <div className="flex overflow-x-auto gap-4 pb-2 -mx-3 px-3 horizontal-scroll">
            {statItems.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-1 min-w-[72px] flex-shrink-0">
                <div className={`flex-shrink-0 ${item.color}`}>
                  <div className="w-7 h-7 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {item.label}
                  </p>
                  <p className={`text-lg font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Scroll indicator */}
          <div className="flex justify-center gap-1 mt-2">
            <div className="w-8 h-1 rounded-full bg-primary/30" />
            <div className="w-2 h-1 rounded-full bg-muted" />
            <div className="w-2 h-1 rounded-full bg-muted" />
          </div>
        </div>
        
        {/* Tablet and Desktop: Grid layout */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-4 md:gap-6">
          {statItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-2 min-w-0 p-2 sm:p-0">
              <div className={`flex-shrink-0 ${item.color}`}>
                <div className="w-6 h-6 flex items-center justify-center">
                  {item.icon}
                </div>
              </div>
              <div className="min-w-0 w-full">
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
      </div>
    </Card>
  );
};