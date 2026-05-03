import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRsvpPurchase } from '@/hooks/useRsvpPurchase';
import { useEvents } from '@/hooks/useEvents';
import { normalizeRsvp } from '@/lib/rsvp';
import { RsvpOverageModal } from '@/components/Dashboard/RsvpOverageModal';
import { cn } from '@/lib/utils';

interface DashboardOverviewProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events } = useEvents();
  const { guests } = useRealtimeGuests(selectedEventId);
  const { totalCapacity, purchase, hasPurchased } = useRsvpPurchase(selectedEventId);
  const [showOverageModal, setShowOverageModal] = useState(false);

  const stats = useMemo(() => {
    const total = guests.length;
    const sent = guests.filter(g => {
      const s = (g.rsvp_invite_status || '').toLowerCase();
      return s && s !== 'not_sent';
    }).length;
    let pending = 0, attending = 0, notAttending = 0;
    for (const g of guests) {
      const s = normalizeRsvp(g.rsvp);
      if (s === 'Attending') attending++;
      else if (s === 'Not Attending') notAttending++;
      else pending++;
    }
    return { total, sent, pending, attending, notAttending };
  }, [guests]);

  const capacity = totalCapacity || 0;
  const overLimit = hasPurchased && capacity > 0 && stats.total > capacity;
  const percent = capacity > 0 ? Math.min(100, (stats.total / capacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Overview of your event, guests, and RSVP activity
        </p>
      </div>

      {/* Event selector */}
      {events.length > 0 && (
        <Card className="ww-box">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Choose Event:
            </label>
            <Select value={selectedEventId || 'no-event'} onValueChange={onEventSelect}>
              <SelectTrigger className="w-full sm:w-[320px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59]">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {!selectedEventId ? (
        <Card className="ww-box text-center py-10">
          <CardTitle className="text-lg">Select an event to see your overview</CardTitle>
          <CardDescription className="mt-2">
            Choose an event above to view RSVP allowance, alerts, and quick stats.
          </CardDescription>
        </Card>
      ) : (
        <>
          {/* RSVP Allowance */}
          <Card className="ww-box">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg sm:text-xl">RSVP Allowance</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {hasPurchased && capacity > 0 ? (
                <>
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <div className="text-2xl sm:text-3xl font-semibold text-foreground">
                      {stats.total} <span className="text-base font-normal text-muted-foreground">of {capacity} guests used</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {purchase?.guest_tier_label}
                    </div>
                  </div>
                  <Progress
                    value={percent}
                    className={cn('h-3', overLimit && '[&>div]:bg-destructive')}
                  />
                  <p className={cn('text-sm', overLimit ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {overLimit
                      ? 'Additional guests required to continue sending invites'
                      : "You're within your RSVP allowance"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Activate RSVP invites from the Guest List to set your allowance.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Over-limit alert */}
          {overLimit && (
            <Card className="ww-box border-destructive/40 bg-destructive/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">Additional Guests Required</h3>
                    <p className="text-sm text-foreground/80 mt-1">
                      You've exceeded your RSVP limit. Please purchase additional guests to continue sending invitations.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowOverageModal(true)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shrink-0"
                >
                  Add More Guests
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Total Guests" value={stats.total} />
            <StatCard icon={Mail} label="Invitations Sent" value={stats.sent} />
            <StatCard icon={Clock} label="Pending Responses" value={stats.pending} />
            <StatCard icon={CheckCircle2} label="Attending" value={stats.attending} accent="text-emerald-600" />
            <StatCard icon={XCircle} label="Not Attending" value={stats.notAttending} accent="text-rose-600" />
          </div>
        </>
      )}

      <RsvpOverageModal
        isOpen={showOverageModal}
        onClose={() => setShowOverageModal(false)}
        eventId={selectedEventId}
        currentGuestCount={stats.total}
        totalCapacity={capacity}
        tierLabel={purchase?.guest_tier_label || ''}
      />
    </div>
  );
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, accent }) => (
  <Card className="ww-box">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className={cn('w-5 h-5 text-primary', accent)} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className={cn('text-xl font-semibold text-foreground', accent)}>{value}</div>
      </div>
    </div>
  </Card>
);
