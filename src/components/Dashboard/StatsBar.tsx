/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
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
      color: "text-primary"
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
      color: "text-primary"
    },
    {
      label: "Seats Filled",
      value: stats.seatsFilled,
      icon: <UserCheck className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Seats Remaining",
      value: stats.seatsRemaining,
      icon: <Clock className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Full Tables",
      value: stats.tablesAtCapacity,
      icon: <Target className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Sent Invites",
      value: stats.sentInvites,
      icon: <Mail className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Unsent Invites",
      value: stats.unsentInvites,
      icon: <Clock className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Replied Invites",
      value: stats.respondedInvites,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: "text-primary"
    },
    {
      label: "Unreplied Invites",
      value: stats.unrespondedInvites,
      icon: <AlertCircle className="w-6 h-6" />,
      color: "text-primary"
    }
  ];

  return (
    <Card className="mb-6 border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <div className="p-3 sm:p-4 md:p-6">
        {/* Mobile: 2 rows × 5 columns grid (all 10 stats) */}
        <div className="sm:hidden">
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {statItems.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-0.5 min-w-0">
                <div className={`flex-shrink-0 ${item.color}`}>
                  <div className="w-5 h-5 flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
                    {item.icon}
                  </div>
                </div>
                <p className="text-[9px] text-primary font-bold leading-tight px-0.5 break-words">
                  {item.label}
                </p>
                <p className={`text-sm font-bold leading-none ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
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
                <p className="text-xs text-primary font-bold truncate">
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