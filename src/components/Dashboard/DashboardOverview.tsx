import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  Users,
  Mail,
  Clock,
  Check,
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import { useRsvpPurchase } from '@/hooks/useRsvpPurchase';
import { normalizeRsvp } from '@/lib/rsvp';
import { RsvpOverageModal } from '@/components/Dashboard/RsvpOverageModal';
import { cn } from '@/lib/utils';
import type { Guest } from '@/hooks/useGuests';

interface EventLite { id: string; name: string }

interface DashboardOverviewProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: EventLite[];
  guests: Guest[];
  onNavigateToGuestList?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  selectedEventId,
  onEventSelect,
  events,
  guests,
  onNavigateToGuestList,
}) => {
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
  const nearLimit = !overLimit && percent >= 80;
  const percentLabel = capacity > 0 ? Math.round((stats.total / capacity) * 100) : 0;

  const goToGuestList = () => {
    if (onNavigateToGuestList) {
      onNavigateToGuestList();
    } else {
      window.location.assign('/dashboard?tab=guest-list');
    }
  };

  const insight = useMemo(() => {
    if (stats.sent === 0) return "You haven't sent any invitations yet";
    if (stats.pending > 0) return `You have ${stats.pending} guest${stats.pending === 1 ? '' : 's'} who haven't responded yet`;
    if (stats.attending > 0) return `${stats.attending} guest${stats.attending === 1 ? ' is' : 's are'} attending your event`;
    return null;
  }, [stats]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          {/* RSVP Allowance — empty state vs active */}
          {!hasPurchased ? (
            <Card className="ww-box bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Activate RSVP Invitations</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send digital invitations and track responses in real-time.
                  </p>
                </div>
                <Button onClick={goToGuestList} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                  Activate RSVP
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="ww-box">
              <CardHeader className="p-0 mb-4 flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg sm:text-xl">RSVP Allowance</CardTitle>
                  {purchase?.guest_tier_label && (
                    <p className="text-xs text-muted-foreground mt-1">{purchase.guest_tier_label}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold px-2.5 py-1 rounded-full',
                    overLimit
                      ? 'bg-destructive/10 text-destructive'
                      : nearLimit
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {percentLabel}% used
                </span>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-semibold text-foreground">{stats.total}</span>
                  <span className="text-base text-muted-foreground">of {capacity} guests used</span>
                </div>

                {/* Animated gradient progress bar */}
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
                      overLimit
                        ? 'bg-gradient-to-r from-destructive to-rose-500'
                        : nearLimit
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                        : 'bg-gradient-to-r from-primary to-[#B89B75]',
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p
                  className={cn(
                    'text-sm',
                    overLimit
                      ? 'text-destructive font-medium'
                      : nearLimit
                      ? 'text-amber-700 font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {overLimit
                    ? 'Additional guests required to continue sending invites'
                    : nearLimit
                    ? "You're nearing your RSVP limit"
                    : "You're within your RSVP allowance"}
                </p>

                <div className="pt-1">
                  <Button
                    onClick={goToGuestList}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Invitations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Over-limit alert */}
          {overLimit && (
            <Card className="ww-box border-destructive/40 bg-destructive/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive text-base">Additional Guests Required</h3>
                  <p className="text-sm text-foreground/80 mt-1">
                    You've exceeded your RSVP limit. Add more guests to continue sending invitations.
                  </p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard icon={Users} label="Total Guests" value={stats.total} />
            <StatCard icon={Mail} label="Invitations Sent" value={stats.sent} />
            <StatCard icon={Clock} label="Pending Replies" value={stats.pending} />
            <StatCard icon={Check} label="Attending" value={stats.attending} tone="success" />
            <StatCard icon={X} label="Not Attending" value={stats.notAttending} tone="danger" />
          </div>

          {/* Mini insight */}
          {insight && (
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              {insight}
            </p>
          )}
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
  tone?: 'default' | 'success' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, tone = 'default' }) => {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'danger'
      ? 'bg-rose-50 text-rose-600'
      : 'bg-primary/10 text-primary';
  return (
    <Card className="ww-box transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-default">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', toneClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </Card>
  );
};
