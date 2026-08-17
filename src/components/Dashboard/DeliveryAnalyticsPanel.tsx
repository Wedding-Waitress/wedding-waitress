/**
 * DeliveryAnalyticsPanel — Smart RSVP & Messaging KPIs
 *
 * Surfaces real-time delivery analytics for an event: invitations sent,
 * responses, SMS/email split, credit usage. Powered by useMessagingAnalytics.
 */
import { Card } from '@/components/ui/card';
import { Mail, MessageSquare, Send, CheckCircle2, XCircle, Clock, Coins } from 'lucide-react';
import { useMessagingAnalytics } from '@/hooks/useMessagingAnalytics';
import styles from './DeliveryAnalyticsPanel.module.css';

interface Props {
  eventId: string | null | undefined;
}

const Kpi = ({
  icon, label, value, hint, accent,
}: { icon: React.ReactNode; label: string; value: string | number; hint?: string; accent?: string }) => (
  <div className={`${styles.kpiCard} rounded-lg border border-border bg-card p-3 flex items-start gap-3`}>
    <div className={`${styles.icon} shrink-0 w-9 h-9 rounded-md flex items-center justify-center ${accent ?? 'bg-primary/10 text-primary'}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className={`${styles.label} text-[11px] uppercase tracking-wide text-muted-foreground`}>{label}</div>
      <div className={`${styles.value} text-lg font-semibold text-foreground leading-tight`}>{value}</div>
      {hint && <div className={`${styles.hint} text-[11px] text-muted-foreground`}>{hint}</div>}
    </div>
  </div>
);

export const DeliveryAnalyticsPanel = ({ eventId }: Props) => {
  const { data, loading } = useMessagingAnalytics(eventId);
  if (!eventId) return null;

  const responsePct = Math.round((data.responseRate || 0) * 100);

  return (
    <Card className={`${styles.panel} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Smart RSVP & Messaging — Delivery analytics</h3>
          <p className={`${styles.description} text-xs text-muted-foreground`}>Live KPIs for this event.</p>
        </div>
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi icon={<Send className="w-4 h-4" />} label="Invitations sent" value={data.totalInvitationsSent} />
        <Kpi icon={<Mail className="w-4 h-4" />} label="Emails sent" value={data.emailsSent}
          accent="bg-blue-500/10 text-blue-600" />
        <Kpi icon={<MessageSquare className="w-4 h-4" />} label="SMS sent" value={data.smsSent}
          accent="bg-emerald-500/10 text-emerald-600" />
        <Kpi icon={<Coins className="w-4 h-4" />} label="SMS credits left"
          value={data.smsCreditsRemaining}
          hint={`${data.smsCreditsUsed}/${data.smsCreditsTotal} used`}
          accent="bg-amber-500/10 text-amber-600" />

        <Kpi icon={<CheckCircle2 className="w-4 h-4" />} label="Attending" value={data.rsvpAttending}
          accent="bg-emerald-500/10 text-emerald-600" />
        <Kpi icon={<XCircle className="w-4 h-4" />} label="Not attending" value={data.rsvpNotAttending}
          accent="bg-rose-500/10 text-rose-600" />
        <Kpi icon={<Clock className="w-4 h-4" />} label="Pending" value={data.rsvpPending}
          accent="bg-muted text-muted-foreground" />
        <Kpi icon={<CheckCircle2 className="w-4 h-4" />} label="Response rate" value={`${responsePct}%`} />
      </div>

      {(data.smsFailed > 0 || data.smsBlocked > 0) && (
        <div className="text-xs text-muted-foreground">
          SMS issues: <span className="font-medium text-rose-600">{data.smsFailed} failed</span>
          {' · '}
          <span className="font-medium text-amber-700">{data.smsBlocked} blocked</span>
          . Use “Resend Smart RSVP” to re-target failed deliveries.
        </div>
      )}
    </Card>
  );
};
