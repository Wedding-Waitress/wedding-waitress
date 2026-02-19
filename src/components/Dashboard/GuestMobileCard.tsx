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
 *
 * Mobile-friendly guest card component for GuestListTable
 * Displays guest info in a card format suitable for small screens
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/enhanced-button";
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, MapPin, Utensils, Users } from "lucide-react";
import { getRsvpBadgeVariant, getRsvpDisplayLabel } from "@/lib/rsvp";
import { RelationBadge } from './RelationBadge';
import { cn } from '@/lib/utils';

interface GuestMobileCardProps {
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    table_no?: number | null;
    seat_no?: number | null;
    rsvp: string;
    dietary?: string | null;
    mobile?: string | null;
    email?: string | null;
    notes?: string | null;
    family_group?: string | null;
    relation_display?: string | null;
    relation_partner?: string | null;
    relation_role?: string | null;
  };
  tableName?: string;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditRelation: () => void;
  partnerName?: string | null;
  guestTypeLabel: string;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
}

export const GuestMobileCard: React.FC<GuestMobileCardProps> = ({
  guest,
  tableName,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onEditRelation,
  partnerName,
  guestTypeLabel,
  isGrouped = false,
  isLastInGroup = false,
}) => {
  const getTypeColor = () => {
    if (guestTypeLabel === 'Couple') return 'bg-orange-500';
    if (guestTypeLabel === 'Family') return 'bg-blue-600';
    return 'bg-pink-500';
  };

  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-xl p-4 space-y-3 transition-all",
        isSelected && "ring-2 ring-primary bg-primary/5",
        isGrouped && "ml-3 border-l-4 border-l-primary/30",
        isLastInGroup && "mb-4"
      )}
    >
      {/* Header: Checkbox, Name, RSVP */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base truncate">
                {guest.first_name} {guest.last_name}
              </span>
              <Badge 
                variant={getRsvpBadgeVariant(guest.rsvp)} 
                className="text-xs text-white flex-shrink-0"
              >
                {getRsvpDisplayLabel(guest.rsvp)}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Type Badge */}
        <span className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white flex-shrink-0",
          getTypeColor()
        )}>
          {guestTypeLabel}
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {/* Table/Seat */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>
            {tableName || 'No table'}{guest.seat_no ? `, Seat ${guest.seat_no}` : ''}
          </span>
        </div>

        {/* Dietary */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Utensils className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{guest.dietary || 'None'}</span>
        </div>
      </div>

      {/* Relation */}
      {guest.relation_display && (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <RelationBadge
            display={guest.relation_display}
            partner={guest.relation_partner || ''}
            role={guest.relation_role || ''}
            partnerName={partnerName}
            onClick={onEditRelation}
            isEmpty={!guest.relation_display}
          />
        </div>
      )}

      {/* Contact indicators */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Mobile:</span>
          <Badge variant={guest.mobile?.trim() ? "default" : "secondary"} className="text-xs px-1.5 py-0">
            {guest.mobile?.trim() ? 'Yes' : 'No'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Email:</span>
          <Badge variant={guest.email?.trim() ? "default" : "secondary"} className="text-xs px-1.5 py-0">
            {guest.email?.trim() ? 'Yes' : 'No'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Notes:</span>
          <Badge variant={guest.notes?.trim() ? "default" : "secondary"} className="text-xs px-1.5 py-0">
            {guest.notes?.trim() ? 'Yes' : 'No'}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onEdit}
          className="h-9 px-4 rounded-full flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDelete}
          className="h-9 px-4 rounded-full flex items-center gap-2 text-destructive border-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};

// Group header for couples/families on mobile
interface GuestGroupHeaderProps {
  groupName: string;
  type: 'couple' | 'family';
  memberCount: number;
}

export const GuestGroupHeader: React.FC<GuestGroupHeaderProps> = ({
  groupName,
  type,
  memberCount,
}) => (
  <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg mb-2">
    <Users className="w-4 h-4 text-primary" />
    <span className="font-semibold text-sm text-primary">
      {groupName}
    </span>
    <Badge variant="secondary" className="text-xs">
      {type === 'couple' ? 'Couple' : 'Family'} • {memberCount} members
    </Badge>
  </div>
);
