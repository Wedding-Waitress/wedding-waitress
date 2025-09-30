import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  X, 
  Edit3, 
  Users,
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
  isEditable?: boolean;
  rsvpDeadline?: string | null;
}

export const EnhancedGuestCard: React.FC<EnhancedGuestCardProps> = ({
  guest,
  onUpdate,
  onEdit,
  isEditable = true,
  rsvpDeadline
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
    try {
      const { error } = await supabase
        .from('guests')
        .update({ 
          rsvp: normalized,
          rsvp_date: new Date().toISOString().slice(0, 10)
        })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: "RSVP Updated",
        description: `Your RSVP has been updated to ${normalized}`,
      });
      
      // Let realtime subscription handle the sync - no manual refresh needed
    } catch (error) {
      console.error('Error updating RSVP:', error);
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
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Guest Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">
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
                variant="ghost"
                size="sm"
                onClick={() => onEdit(guest)}
                className="ml-2"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Table Assignment */}
          <div className="flex items-start gap-3 p-4 bg-background-subtle rounded-lg">
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
            <div className="flex items-start gap-3 p-4 bg-background-subtle rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Seat {guest.seat_no}</div>
                <div className="text-sm text-muted-foreground">Your assigned seat</div>
              </div>
            </div>
          )}

          {/* Dietary Info */}
          {guest.dietary && guest.dietary !== 'NA' && (
            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <Utensils className="w-5 h-5 text-accent-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Dietary Requirements</div>
                <div className="text-sm text-muted-foreground">{guest.dietary}</div>
              </div>
            </div>
          )}

          {/* RSVP Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">RSVP Status:</span>
              <div className={`flex items-center gap-1 ${getRsvpColor(localRsvp)}`}>
                {React.createElement(getRsvpIcon(localRsvp), { className: "w-4 h-4" })}
                <span className="text-sm font-medium">
                  {getRsvpDisplayLabel(localRsvp)}
                </span>
              </div>
            </div>
            
            {localRsvp !== 'Attending' && isEditable && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateRsvp('Attending')}
                  disabled={updatingRsvp}
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateRsvp('Not Attending')}
                  disabled={updatingRsvp}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          </div>

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