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
  Pencil,
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
}

export const EnhancedGuestCard: React.FC<EnhancedGuestCardProps> = ({
  guest,
  onUpdate,
  onEdit,
  onAddGuest,
  isEditable = true,
  rsvpDeadline,
  additionalGuestCount
}) => {
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const { toast } = useToast();
  const [localRsvp, setLocalRsvp] = useState<RsvpStatus>(normalizeRsvp(guest.rsvp));
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

  const updateRsvp = async (newRsvp: string) => {
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
      // Use RPC function to bypass RLS for public updates
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

  return (
    <Card className="card-elevated border-primary/20 bg-gradient-card">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-1.5">
          {/* Guest Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">
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
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
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
            </div>
            
            {onEdit && isEditable && (
              <Button
                onClick={() => onEdit(guest)}
                className="ml-2 rounded-full px-5 py-1.5 h-auto bg-primary text-white hover:bg-primary/90 text-sm font-semibold"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Table Assignment */}
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
                  className={`text-base font-bold px-3 py-1 rounded-full border-2 ${
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
          {isEditable && (
            <div className="flex gap-2 justify-center pt-1">
              <Button
                size="sm"
                onClick={() => updateRsvp('Attending')}
                disabled={updatingRsvp}
                className="bg-success text-success-foreground hover:bg-success/90 text-sm font-medium"
              >
                {updatingRsvp ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                onClick={() => updateRsvp('Not Attending')}
                disabled={updatingRsvp}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium"
              >
                {updatingRsvp ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Decline
              </Button>
              {onAddGuest && (
                <Button
                  size="sm"
                  onClick={onAddGuest}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add Guest
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
    </Card>
  );
};