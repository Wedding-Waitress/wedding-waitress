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
  UsersRound,
  Table2,
  Armchair,
  UserCheck,
  UserMinus,
  CircleCheckBig,
  Send,
  MailPlus,
  MailCheck,
  MailQuestion,
  ChartNoAxesCombined
} from "lucide-react";
import styles from './StatsBar.module.css';

const STAT_ICON_PROPS = { size: 21, strokeWidth: 1.8, "aria-hidden": true } as const;
const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

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
      icon: <UsersRound {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Tables Created",
      value: stats.tablesCreated,
      icon: <Table2 {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Seats Created",
      value: stats.seatsCreated,
      icon: <Armchair {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Seats Filled",
      value: stats.seatsFilled,
      icon: <UserCheck {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Seats Remaining",
      value: stats.seatsRemaining,
      icon: <UserMinus {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Full Tables",
      value: stats.tablesAtCapacity,
      icon: <CircleCheckBig {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Sent Invites",
      value: stats.sentInvites,
      icon: <Send {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Unsent Invites",
      value: stats.unsentInvites,
      icon: <MailPlus {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Replied Invites",
      value: stats.respondedInvites,
      icon: <MailCheck {...STAT_ICON_PROPS} />,
      color: "text-primary"
    },
    {
      label: "Unreplied Invites",
      value: stats.unrespondedInvites,
      icon: <MailQuestion {...STAT_ICON_PROPS} />,
      color: "text-primary"
    }
  ];

  return (
    <Card className="ww-stats-bar mb-6 border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <div className="p-3 sm:p-4 md:p-6">
        <div
          className="ww-stats-overview mb-5 flex items-start gap-2.5 text-left sm:mb-6"
          data-stats-overview
        >
          <ChartNoAxesCombined
            size={22}
            strokeWidth={1.8}
            className={`${styles.overviewIcon} mt-0.5 shrink-0`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              className={styles.overviewHeading}
              style={{
                fontFamily: MANROPE_FONT,
                fontSize: '24px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: 'normal',
              }}
            >
              Guest &amp; RSVP Overview
            </h2>
            <p
              className={`${styles.overviewSubtitle} mt-1 break-words`}
              style={{
                fontFamily: MANROPE_FONT,
                fontSize: '13px',
                fontWeight: 400,
                lineHeight: '18px',
                letterSpacing: 'normal',
              }}
            >
              Monitor guest capacity, tables, seating and invitation activity at a glance, so you can stay up to date and in control of your planning.
            </p>
          </div>
        </div>

        {/* Mobile: 2 rows × 5 columns grid (all 10 stats) */}
        <div className="sm:hidden">
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {statItems.slice(0, 5).map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-0.5 min-w-0">
                <div className={`ww-stat-icon flex-shrink-0 ${item.color}`}>
                  <div className="w-5 h-5 flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
                    {item.icon}
                  </div>
                </div>
                <p className="ww-stat-label text-[9px] text-primary font-bold leading-tight px-0.5 break-words">
                  {item.label}
                </p>
                <p className={`ww-stat-value text-sm font-bold leading-none ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="ww-stats-divider my-3 h-px w-full bg-primary/30" />
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {statItems.slice(5).map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-0.5 min-w-0">
                <div className={`ww-stat-icon flex-shrink-0 ${item.color}`}>
                  <div className="w-5 h-5 flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
                    {item.icon}
                  </div>
                </div>
                <p className="ww-stat-label text-[9px] text-primary font-bold leading-tight px-0.5 break-words">
                  {item.label}
                </p>
                <p className={`ww-stat-value text-sm font-bold leading-none ${item.color}`}>
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
              <div className={`ww-stat-icon flex-shrink-0 ${item.color}`}>
                <div className="w-6 h-6 flex items-center justify-center">
                  {item.icon}
                </div>
              </div>
              <div className="min-w-0 w-full">
                <p className="ww-stat-label text-xs text-primary font-bold truncate">
                  {item.label}
                </p>
                <p className={`ww-stat-value text-lg font-bold ${item.color}`}>
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
