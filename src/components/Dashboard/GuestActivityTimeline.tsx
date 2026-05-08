/**
 * GuestActivityTimeline — Stripe/HubSpot-style chronological activity feed for a guest.
 *
 * Premium future feature. Component is implemented and ready to mount; it is
 * NOT yet wired into the Guest List UI per product direction.
 *
 * Usage (when rolled out):
 *   <GuestActivityTimeline guestId={guest.id} />
 */
import { useMemo, useState } from 'react';
import { useGuestActivities, type GuestActivity, type GuestActivityType } from '@/hooks/useGuestActivities';
import { cn } from '@/lib/utils';
import {
  Mail, MessageSquare, CheckCircle2, Eye, MousePointerClick, Reply,
  RotateCcw, Bell, UserPlus, FileText, AlertTriangle, XCircle, Ban, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react';

interface Props {
  guestId: string | null | undefined;
  defaultOpen?: boolean;
  className?: string;
}

const TYPE_META: Record<GuestActivityType, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  invited_email:   { label: 'Invited by Email', icon: Mail,             tone: 'text-blue-600 bg-blue-50 ring-blue-100' },
  invited_sms:     { label: 'Invited by SMS',   icon: MessageSquare,    tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
  delivered:       { label: 'Delivered',        icon: CheckCircle2,     tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  opened:          { label: 'Opened',           icon: Eye,              tone: 'text-indigo-600 bg-indigo-50 ring-indigo-100' },
  clicked:         { label: 'Clicked',          icon: MousePointerClick,tone: 'text-violet-600 bg-violet-50 ring-violet-100' },
  responded:       { label: 'Responded',        icon: Reply,            tone: 'text-amber-700 bg-amber-50 ring-amber-100' },
  resent:          { label: 'Resent',           icon: RotateCcw,        tone: 'text-slate-700 bg-slate-50 ring-slate-200' },
  reminder_sent:   { label: 'Reminder Sent',    icon: Bell,             tone: 'text-orange-600 bg-orange-50 ring-orange-100' },
  rsvp_changed:    { label: 'RSVP Changed',     icon: FileText,         tone: 'text-[#967A59] bg-[#F5EFE6] ring-[#E8E1D6]' },
  plus_one_added:  { label: 'Plus-One Added',   icon: UserPlus,         tone: 'text-teal-600 bg-teal-50 ring-teal-100' },
  note_added:      { label: 'Note Added',       icon: FileText,         tone: 'text-slate-600 bg-slate-50 ring-slate-200' },
  bounced:         { label: 'Bounced',          icon: AlertTriangle,    tone: 'text-red-600 bg-red-50 ring-red-100' },
  failed:          { label: 'Failed',           icon: XCircle,          tone: 'text-red-700 bg-red-50 ring-red-100' },
  unsubscribed:    { label: 'Unsubscribed',     icon: Ban,              tone: 'text-zinc-600 bg-zinc-50 ring-zinc-200' },
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
};

const Row = ({ a }: { a: GuestActivity }) => {
  const meta = TYPE_META[a.activity_type] ?? { label: a.activity_type, icon: Clock, tone: 'text-muted-foreground bg-muted ring-border' };
  const Icon = meta.icon;
  const failure = a.status === 'failure';
  const pending = a.status === 'pending';
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full ring-1 shrink-0',
          meta.tone,
          failure && 'text-red-700 bg-red-50 ring-red-100',
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 w-px bg-border/70 mt-1" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">
            {meta.label}
            {pending && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">pending</span>}
            {failure && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-700">failed</span>}
          </p>
          <span className="text-xs text-muted-foreground" title={new Date(a.occurred_at).toLocaleString()}>
            {formatWhen(a.occurred_at)}
          </span>
        </div>
        {a.summary && <p className="text-xs text-muted-foreground mt-0.5 break-words">{a.summary}</p>}
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 capitalize">via {a.channel}</p>
      </div>
    </li>
  );
};

export const GuestActivityTimeline = ({ guestId, defaultOpen = false, className }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const { activities, loading } = useGuestActivities(guestId, { enabled: open });

  const grouped = useMemo(() => activities, [activities]);

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lv-premium-shade rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#967A59]" />
          <span className="text-sm font-semibold text-foreground">Activity Timeline</span>
          {activities.length > 0 && (
            <span className="text-xs text-muted-foreground">({activities.length})</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 max-h-[420px] overflow-y-auto">
          {loading && activities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">Loading activity…</p>
          ) : grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No activity yet for this guest.</p>
          ) : (
            <ol className="relative">
              {grouped.map(a => <Row key={a.id} a={a} />)}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

export default GuestActivityTimeline;
