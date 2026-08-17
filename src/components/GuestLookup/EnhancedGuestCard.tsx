import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  X, 
  XCircle,
  PlusCircle,
  ClipboardCheck,
  Users,
  UserPlus,
  Utensils,
  Phone,
  Mail
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { normalizeRsvp, getRsvpDisplayLabel, type RsvpStatus } from '@/lib/rsvp';
import { useToast } from '@/hooks/use-toast';
import { formatDisplayDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Guest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  seat_no?: number | null;
  relation_display?: string;
  rsvp: string;
  dietary?: string;
  mobile?: string;
  email?: string;
}

interface EnhancedGuestCardProps {
  guest: Guest;
  onUpdate: () => void;
  onEdit?: (guest: Guest) => void;
  onAddGuest?: () => void;
  isEditable?: boolean;
  rsvpDeadline?: string | null;
  additionalGuestCount?: number;
  /** 7-day auto-protection: when false, Accept/Decline are hidden */
  showRsvpButtons?: boolean;
  /** 7-day auto-protection: when false, Add +1 Guest is hidden */
  showAddPlusOne?: boolean;
  /** 7-day auto-protection: when false, Update Your Details is hidden */
  showUpdateDetails?: boolean;
}

export const EnhancedGuestCard: React.FC<EnhancedGuestCardProps> = ({
  guest,
  onUpdate,
  onEdit,
  onAddGuest,
  isEditable = true,
  rsvpDeadline,
  additionalGuestCount,
  showRsvpButtons = true,
  showAddPlusOne = true,
  showUpdateDetails = true,
}) => {
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const { toast } = useToast();
  const [localRsvp, setLocalRsvp] = useState<RsvpStatus>(normalizeRsvp(guest.rsvp));
  const [pendingRsvp, setPendingRsvp] = useState<RsvpStatus | null>(null);
  const suppressNextClickRef = React.useRef(false);
  useEffect(() => {
    setLocalRsvp(normalizeRsvp(guest.rsvp));
  }, [guest.rsvp]);

  const getRsvpColor = (status: string) => {
    const normalized = normalizeRsvp(status);
    switch (normalized) {
      case "Attending":
        return "text-green-600";
      case "Not Attending":
        return "text-red-600";
      case "Pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getRsvpIcon = (status: string) => {
    const normalized = normalizeRsvp(status);
    switch (normalized) {
      case "Attending":
        return CheckCircle2;
      case "Not Attending":
        return X;
      case "Pending":
        return Clock;
      default:
        return Clock;
    }
  };

  const performRsvpUpdate = async (newRsvp: string) => {
    setUpdatingRsvp(true);
    const prev = localRsvp;
    const normalized = normalizeRsvp(newRsvp);
    setLocalRsvp(normalized);

    console.log('📤 Updating RSVP:', {
      guest_id: guest.id,
      event_id: guest.event_id,
      rsvp: normalized
    });

    try {
      const { data, error } = await supabase.rpc('update_guest_rsvp_public', {
        _guest_id: guest.id,
        _event_id: guest.event_id,
        _rsvp: normalized
      });

      console.log('📥 RPC Response:', { data, error });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ Update returned false - event may not allow public updates');
        throw new Error('Update failed - event may not allow public updates');
      }

      console.log('✅ RSVP update successful');
      toast({
        title: "RSVP Updated",
        description: `Your RSVP has been updated to ${normalized}`,
      });

      onUpdate?.();
    } catch (error) {
      console.error('❌ Error updating RSVP:', error);
      setLocalRsvp(prev);
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRsvp(false);
    }
  };

  const updateRsvp = (newRsvp: string) => {
    if (updatingRsvp) return;
    const normalized = normalizeRsvp(newRsvp);
    // Same choice → no-op (no popup, no sync)
    if (normalized === localRsvp) return;
    // First-time RSVP (currently Pending) → instant update, no popup
    if (localRsvp === 'Pending') {
      void performRsvpUpdate(normalized);
      return;
    }
    // Changing to a different RSVP after already responding → confirm
    setPendingRsvp(normalized);
  };

  const confirmPendingRsvp = () => {
    if (pendingRsvp) {
      void performRsvpUpdate(pendingRsvp);
    }
    setPendingRsvp(null);
  };

  const openAddGuest = () => {
    onAddGuest?.();
  };

  const openEditDetails = () => {
    onEdit?.(guest);
  };

  const blurActive = () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === 'function') el.blur();
  };

  const runAfterKeyboardDismiss = (action: () => void) => {
    blurActive();
    window.requestAnimationFrame(action);
  };

  const handleTouchStartAction = (event: React.PointerEvent<HTMLButtonElement>, action: () => void) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    suppressNextClickRef.current = true;
    runAfterKeyboardDismiss(action);
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 350);
  };

  const handleAddGuestClick = () => {
    if (suppressNextClickRef.current) return;
    runAfterKeyboardDismiss(openAddGuest);
  };

  const handleEditDetailsClick = () => {
    if (suppressNextClickRef.current) return;
    runAfterKeyboardDismiss(openEditDetails);
  };

  return (
    <Card className="card-elevated border-primary/20 bg-gradient-card">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-1.5">
          {/* Guest Info - centered */}
          <div className="text-center">
            <h3 className="text-center font-bold text-lg md:text-xl text-[#1D1D1F]">
              {guest.first_name} {guest.last_name}
            </h3>
            {guest.relation_display && (
              <p className="text-sm text-muted-foreground mt-1">
                {guest.relation_display}
              </p>
            )}

            {/* Notice when not editable */}
            {!isEditable && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                RSVP date has passed. Changes are closed.
              </p>
            )}

            {/* Contact Info */}
            {(guest.email || guest.mobile) && (
              <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-muted-foreground">
                {guest.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{guest.email}</span>
                  </div>
                )}
                {guest.mobile && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{guest.mobile}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Assignment - neutral row matching Seat / Dietary */}
          <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
            <Users className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              {guest.table_no ? (
                <>
                  <div className="font-semibold text-foreground">Table {guest.table_no}</div>
                  <div className="text-sm text-muted-foreground">Your assigned table</div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-foreground">No Table Assigned</div>
                  <div className="text-sm text-muted-foreground">Please see event staff</div>
                </>
              )}
            </div>
          </div>

          {/* Seat Assignment */}
          {guest.seat_no && (
            <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Seat {guest.seat_no}</div>
                <div className="text-sm text-muted-foreground">Your assigned seat</div>
              </div>
            </div>
          )}

          {/* Dietary Info */}
          {guest.dietary && guest.dietary !== 'NA' && (
            <div className="flex items-start gap-3 p-2 bg-accent/50 rounded-lg">
              <Utensils className="w-5 h-5 text-accent-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Dietary Requirements</div>
                <div className="text-sm text-muted-foreground">{guest.dietary}</div>
              </div>
            </div>
          )}

          {/* Additional Guests */}
          <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
            <UserPlus className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">Additional Guests</div>
              <div className="text-sm text-muted-foreground">
                {(additionalGuestCount ?? 0) > 0 ? `${additionalGuestCount} added` : 'None added'}
              </div>
            </div>
          </div>

          {/* RSVP Section */}
          <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">RSVP Status:</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs sm:text-base font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-2 whitespace-nowrap ${
                    localRsvp === "Attending" 
                      ? "bg-green-100 text-green-700 border-green-500" 
                      : localRsvp === "Not Attending"
                      ? "bg-red-100 text-red-700 border-red-500"
                      : "bg-yellow-100 text-yellow-700 border-yellow-500"
                  }`}
                >
                  {getRsvpDisplayLabel(localRsvp)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons - centered in full card width */}
          {isEditable && (showRsvpButtons || (onAddGuest && showAddPlusOne)) && (
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              {showRsvpButtons && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => updateRsvp('Attending')}
                    disabled={updatingRsvp}
                    className="lv-premium-btn bg-success text-success-foreground text-sm h-[36px] min-h-0 px-[18px] py-0"
                  >
                    {updatingRsvp ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : null}
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => updateRsvp('Not Attending')}
                    disabled={updatingRsvp}
                    className="lv-premium-btn bg-destructive text-destructive-foreground text-sm h-[36px] min-h-0 px-[18px] py-0"
                  >
                    {updatingRsvp ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : null}
                    Decline
                  </Button>
                </>
              )}
              {onAddGuest && showAddPlusOne && (
                <Button
                  type="button"
                  size="sm"
                  onPointerDown={(event) => handleTouchStartAction(event, openAddGuest)}
                  onClick={handleAddGuestClick}
                  className="lv-premium-btn bg-primary text-primary-foreground text-sm h-[36px] min-h-0 px-[18px] py-0"
                >
                  Add +1 Guest
                </Button>
              )}
            </div>
          )}

          {/* Divider + Update Your Details (moved from top) */}
          {onEdit && isEditable && showUpdateDetails && (
            <>
              <div className="my-6 border-t border-border" />
              <div className="flex justify-center">
                <Button
                  type="button"
                  onPointerDown={(event) => handleTouchStartAction(event, openEditDetails)}
                  onClick={handleEditDetailsClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  Update Your Details
                </Button>
              </div>
            </>
          )}

          {/* RSVP Deadline */}
          {rsvpDeadline && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">RSVP Deadline:</span>
              <span className="text-sm font-semibold text-destructive">
                {formatDisplayDate(rsvpDeadline)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <AlertDialog open={pendingRsvp !== null} onOpenChange={(open) => { if (!open) setPendingRsvp(null); }}>
        <AlertDialogContent className="ww-public-live-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>RSVP Already Submitted</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">You have already responded to this invitation.</span>
              <span className="block">Changing your RSVP may affect seating arrangements, catering, and event planning.</span>
              <span className="block">Are you sure you want to send this update to the organiser?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Current RSVP</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingRsvp}>Yes, Update RSVP</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
