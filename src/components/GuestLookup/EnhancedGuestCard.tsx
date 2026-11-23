import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PartyPopper, Hand, Smile, Frown, CheckCircle2,
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

import {useGuestExperienceClient,useGuestExperiencePreview} from '@/contexts/GuestExperiencePreviewContext';
import { normalizeRsvp, getRsvpDisplayLabel, type RsvpStatus } from '@/lib/rsvp';
import { useToast } from '@/hooks/use-toast';
import { formatDisplayDate } from '@/lib/utils';
import { getRelationDisplayText } from '@/lib/relationUtils';
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
  table_name?: string;
}

interface EnhancedGuestCardProps {
  guest: Guest;
  onUpdate: () => void;
  onAddGuest?: () => void;
  isEditable?: boolean;
  rsvpDeadline?: string | null;
  additionalGuestCount?: number;
  /** Existing invited members of the recipient's family/couple group. */
  partyMembers?: Guest[];
  /** 7-day auto-protection: when false, Accept/Decline are hidden */
  showRsvpButtons?: boolean;
  /** 7-day auto-protection: when false, Add +1 Guest is hidden */
  showAddPlusOne?: boolean;
}

export const EnhancedGuestCard: React.FC<EnhancedGuestCardProps> = ({
  guest,
  onUpdate,
  onAddGuest,
  isEditable = true,
  rsvpDeadline,
  additionalGuestCount,
  partyMembers = [],
  showRsvpButtons = true,
  showAddPlusOne = true,
}) => {
  const supabase=useGuestExperienceClient();
  const relationship = getRelationDisplayText(guest.relation_display);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const { toast } = useToast();
  const [localRsvp, setLocalRsvp] = useState<RsvpStatus>(normalizeRsvp(guest.rsvp));
  const [pendingRsvp, setPendingRsvp] = useState<RsvpStatus | null>(null);
  const suppressNextClickRef = React.useRef(false);
  useEffect(() => {
    setLocalRsvp(normalizeRsvp(guest.rsvp));
  }, [guest.rsvp]);
  const [authoritativeTableName, setAuthoritativeTableName] = useState<string | null>(guest.table_name || null);
  useEffect(() => {
    let cancelled = false;
    setAuthoritativeTableName(guest.table_name || null);
    if (!guest.table_id) {
      setAuthoritativeTableName(guest.table_name || null);
      return;
    }
    // Use the exact same public table resolver as the seating-table view so
    // this compact summary cannot drift from the authoritative assignment.
    void supabase.rpc('get_public_table_data', { p_table_id: guest.table_id, p_event_id: guest.event_id })
      .then(({ data, error }: any) => {
        if (!cancelled && !error && data?.[0]?.table_name) setAuthoritativeTableName(data[0].table_name);
      });
    return () => { cancelled = true; };
  }, [guest.event_id, guest.table_id, guest.table_name]);

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

  const tableLabel = (() => {
    if (guest.table_no != null) return `Table ${guest.table_no}${authoritativeTableName ? ` – ${authoritativeTableName}` : ''}`;
    const legacyMatch = authoritativeTableName?.match(/^(\d+)\.\s*(.+)$/);
    if (legacyMatch) return `Table ${legacyMatch[1]} – ${legacyMatch[2]}`;
    return authoritativeTableName ? `Table ${authoritativeTableName}` : 'Table assigned';
  })();

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

  return (
    <Card className="card-elevated border-primary/20 bg-gradient-card p-2 md:p-2">
      <CardContent className="p-2">
        <div className="flex flex-col space-y-1.5">
          {/* Guest Info - centered */}
          <div className="text-center pb-[11px]">
            <h3 data-guest-welcome className="flex items-center justify-center gap-2 text-center font-bold text-lg md:text-xl text-[#1D1D1F]">
              <Hand aria-hidden="true" className="h-5 w-5 shrink-0 text-white" /><span>Welcome, {guest.first_name} {guest.last_name}</span><PartyPopper aria-hidden="true" className="h-5 w-5 shrink-0 text-white" />
            </h3>
            {relationship && (
              <p className="text-sm text-muted-foreground mt-1">
                {relationship}
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
              {(guest.table_id || guest.table_no != null) ? (
                <>
                  <div data-live-label className="font-semibold text-foreground">{tableLabel}</div>
                  <div data-live-body className="text-sm text-muted-foreground">Your assigned table</div>
                </>
              ) : (
                <>
                  <div data-live-label className="font-semibold text-foreground">No Table Assigned</div>
                  <div data-live-body className="text-sm text-muted-foreground">Please see event staff</div>
                </>
              )}
            </div>
          </div>

          {/* Seat Assignment */}
          {guest.seat_no && (
            <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div data-live-label className="font-semibold text-foreground">Seat {guest.seat_no}</div>
                <div data-live-body className="text-sm text-muted-foreground">Your assigned seat</div>
              </div>
            </div>
          )}

          {/* Dietary Info */}
          {guest.dietary && guest.dietary !== 'NA' && (
            <div className="flex items-start gap-3 p-2 bg-accent/50 rounded-lg">
              <Utensils className="w-5 h-5 text-accent-foreground mt-0.5" />
              <div className="flex-1">
                <div data-live-label className="font-semibold text-foreground">Dietary Requirements</div>
                <div data-live-body className="text-sm text-muted-foreground">{guest.dietary}</div>
              </div>
            </div>
          )}

          {/* Invited party members are not self-added +1 guests. */}
          {partyMembers.length > 1 && (
            <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div data-live-label className="font-semibold text-foreground">Your family / party</div>
                <div data-live-body className="text-sm text-muted-foreground">
                  {partyMembers.length} invited members: {partyMembers.map((member) => `${member.first_name} ${member.last_name}`.trim()).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* True self-added guests stay separate from the invited party. */}
          <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
            <UserPlus className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div data-live-label className="font-semibold text-foreground">Additional +1 guests</div>
              <div data-live-body className="text-sm text-muted-foreground">
                {(additionalGuestCount ?? 0) > 0 ? `${additionalGuestCount} added` : 'None added'}
              </div>
            </div>
          </div>

          {/* RSVP Section */}
          <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span data-live-label className="font-semibold text-foreground">RSVP Status:</span>
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
                    className="guest-rsvp-action lv-premium-btn bg-success text-success-foreground text-sm h-[36px] min-h-0 px-[18px] py-0"
                  >
                    {updatingRsvp ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : <Smile aria-hidden="true" className="h-4 w-4 shrink-0 text-white" />}
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => updateRsvp('Not Attending')}
                    disabled={updatingRsvp}
                    className="guest-rsvp-action lv-premium-btn bg-destructive text-destructive-foreground text-sm h-[36px] min-h-0 px-[18px] py-0"
                  >
                    {updatingRsvp ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : <Frown aria-hidden="true" className="h-4 w-4 shrink-0 text-white" />}
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
