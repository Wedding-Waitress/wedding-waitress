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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/enhanced-button";
import { getRelationDisplayText } from '@/lib/relationUtils';

interface RelationBadgeProps {
  display: string;
  partner: string;
  role: string;
  partnerName?: string;
  onClick?: () => void;
  isEmpty?: boolean;
}

export const RelationBadge: React.FC<RelationBadgeProps> = ({
  display,
  partner,
  role,
  partnerName,
  onClick,
  isEmpty = false
}) => {
  const safeDisplay = getRelationDisplayText(display, role);

  if (isEmpty || !safeDisplay) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">No relation set</span>
        {onClick && <Button
          variant="link"
          size="sm"
          onClick={onClick}
          className="h-auto p-0 text-xs text-primary hover:text-primary/80"
        >
          Set
        </Button>}
      </div>
    );
  }

  // Try splitting by new format first, then fall back to old format
  let parts = safeDisplay.split(' — ');
  if (parts.length === 1) {
    // Old format: try splitting by '/'
    parts = safeDisplay.split('/');
  }
  const displayPartner = parts[0] || partnerName;
  const displayRole = parts[1] || role;

  return (
    <div 
      className={onClick ? "flex flex-col cursor-pointer group hover:opacity-80 transition-opacity" : "flex flex-col"}
      onClick={onClick}
    >
      <span className="font-bold text-foreground text-sm">{displayPartner}</span>
      <span className="text-foreground text-sm">{displayRole}</span>
    </div>
  );
};
