import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, MessageSquare } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface LogRow {
  id: string;
  created_at: string;
  to_masked: string | null;
  status: string;
  twilio_sid: string | null;
  error_message: string | null;
  guest_id: string | null;
  delivery_method?: string | null;
  guest_name?: string;
  guest_rsvp?: string | null;
}

interface Props {
  eventId: string | null | undefined;
  limit?: number;
}

const MethodBadge = ({ method }: { method?: string | null }) => {
  const m = (method ?? 'sms').toLowerCase();
  if (m === 'email') {
    return (
      <Badge variant="outline" className="border-blue-500/40 text-blue-700 bg-blue-500/10 gap-1">
        <Mail className="w-3 h-3" /> Email
      </Badge>
    );
  }
  if (m === 'both') {
    return (
      <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
        <Mail className="w-3 h-3" /> + <MessageSquare className="w-3 h-3" /> Email + SMS
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 gap-1">
      <MessageSquare className="w-3 h-3" /> SMS
    </Badge>
  );
};

/**
 * SmsLogsHistory — paginated audit log of SMS sends for an event.
 * Shows recipient (masked), status, timestamp, RSVP response, and error if failed.
 */
export const SmsLogsHistory = ({ eventId, limit = 50 }: Props) => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState<'all' | 'email' | 'sms' | 'both'>('all');

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: logs } = await supabase
          .from('sms_send_logs')
          .select('id, created_at, to_masked, status, twilio_sid, error_message, guest_id, delivery_method')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(limit);

        const guestIds = Array.from(new Set((logs ?? []).map(r => r.guest_id).filter(Boolean))) as string[];
        const guestMap: Record<string, { name: string; rsvp: string | null }> = {};
        if (guestIds.length) {
          const { data: guests } = await supabase
            .from('guests')
            .select('id, first_name, last_name, rsvp')
            .in('id', guestIds);
          (guests ?? []).forEach(g => {
            guestMap[g.id] = {
              name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || '—',
              rsvp: g.rsvp ?? null,
            };
          });
        }

        if (cancelled) return;
        setRows(
          (logs ?? []).map(r => ({
            ...r,
            guest_name: r.guest_id ? guestMap[r.guest_id]?.name : '—',
            guest_rsvp: r.guest_id ? guestMap[r.guest_id]?.rsvp : null,
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, limit]);

  if (!eventId) return null;

  const filteredRows = methodFilter === 'all'
    ? rows
    : rows.filter(r => (r.delivery_method ?? 'sms').toLowerCase() === methodFilter);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold">SMS history</h3>
        <div className="flex items-center gap-2">
          <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as typeof methodFilter)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Filter method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="sms">SMS only</SelectItem>
              <SelectItem value="both">Email + SMS</SelectItem>
            </SelectContent>
          </Select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
      {filteredRows.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? 'No SMS sent yet.' : 'No entries match this filter.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-3">When</th>
                <th className="py-1.5 pr-3">Guest</th>
                <th className="py-1.5 pr-3">To</th>
                <th className="py-1.5 pr-3">Method</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">RSVP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-1.5 pr-3">{r.guest_name}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.to_masked ?? '—'}</td>
                  <td className="py-1.5 pr-3">
                    <MethodBadge method={r.delivery_method} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <Badge
                      variant={
                        r.status === 'delivered' || r.status === 'sent'
                          ? 'default'
                          : r.status === 'queued'
                          ? 'outline'
                          : r.status === 'blocked'
                          ? 'secondary'
                          : 'destructive' /* failed | undelivered */
                      }
                    >
                      {r.status}
                    </Badge>
                    {r.error_message && r.status !== 'sent' && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[260px] truncate" title={r.error_message}>
                        {r.error_message}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">{r.guest_rsvp ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
