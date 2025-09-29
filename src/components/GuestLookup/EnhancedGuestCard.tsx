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
import { normalizeRsvp, type RsvpStatus } from '@/lib/rsvp';
import { useToast } from '@/hooks/use-toast';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  relation_display?: string;
  rsvp: string;
  dietary?: string;
  mobile?: string;
  email?: string;
}

interface EnhancedGuestCardProps {
  guest: Guest;
  onUpdate: () => void;
  onEdit: (guest: Guest) => void;
}

export const EnhancedGuestCard: React.FC<EnhancedGuestCardProps> = ({
  guest,
  onUpdate,
  onEdit
}) => {
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const { toast } = useToast();
  const [localRsvp, setLocalRsvp] = useState<RsvpStatus>(normalizeRsvp(guest.rsvp));
  useEffect(() => {
    setLocalRsvp(normalizeRsvp(guest.rsvp));
  }, [guest.rsvp]);

  const getRsvpColor = (rsvp: string) => {
    switch (rsvp?.toLowerCase()) {
      case 'attending': return 'text-success';
      case 'not attending': return 'text-destructive';
      default: return 'text-warning';
    }
  };

  const getRsvpIcon = (rsvp: string) => {
    switch (rsvp?.toLowerCase()) {
      case 'attending': return <CheckCircle2 className="w-4 h-4" />;
      case 'not attending': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
        .update({ rsvp: normalized })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: "RSVP Updated",
        description: `Your RSVP has been updated to ${normalized}`,
      });
      
      // Add small delay to ensure database consistency before refresh
      setTimeout(() => {
        onUpdate();
      }, 100);
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
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(guest)}
              className="ml-2"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>

          {/* Table Assignment */}
          <div className="flex items-center justify-between p-4 bg-background-subtle rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                {guest.table_no ? (
                  <>
                    <div className="font-semibold">Table {guest.table_no}</div>
                    <div className="text-sm text-muted-foreground">Your assigned table</div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">No Table Assigned</div>
                    <div className="text-sm text-muted-foreground">Please see event staff</div>
                  </>
                )}
              </div>
            </div>
            
            {guest.table_no && (
              <Badge variant="default" className="text-lg px-4 py-2">
                Table {guest.table_no}
              </Badge>
            )}
          </div>

          {/* Dietary Info */}
          {guest.dietary && guest.dietary !== 'NA' && (
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              <Utensils className="w-4 h-4 text-accent-foreground" />
              <div>
                <div className="text-sm font-medium">Dietary Requirements</div>
                <div className="text-sm text-muted-foreground">{guest.dietary}</div>
              </div>
            </div>
          )}

          {/* RSVP Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">RSVP Status:</span>
                <div className={`flex items-center gap-1 ${getRsvpColor(localRsvp)}`}>
                  {getRsvpIcon(localRsvp)}
                  <span className="text-sm font-medium capitalize">
                    {localRsvp || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            
            {localRsvp !== 'Attending' && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => updateRsvp('Attending')}
                  disabled={updatingRsvp}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Attendance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateRsvp('Not Attending')}
                  disabled={updatingRsvp}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};