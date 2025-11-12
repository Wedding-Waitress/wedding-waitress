import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils';

interface ReminderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
}

interface ReminderDelivery {
  id: string;
  sent_at: string | null;
  delivery_method: string;
  status: string;
  reminder_type: string;
  guests: {
    first_name: string;
    last_name: string;
  };
}

export const ReminderHistoryModal = ({ isOpen, onClose, eventId }: ReminderHistoryModalProps) => {
  const [deliveries, setDeliveries] = useState<ReminderDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchDeliveries();
    }
  }, [isOpen, eventId]);

  const fetchDeliveries = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data: campaigns } = await supabase
        .from('rsvp_reminder_campaigns')
        .select('id')
        .eq('event_id', eventId);

      if (!campaigns || campaigns.length === 0) {
        setDeliveries([]);
        setLoading(false);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);

      const { data } = await supabase
        .from('reminder_deliveries')
        .select(`
          id,
          sent_at,
          delivery_method,
          status,
          reminder_type,
          guests (
            first_name,
            last_name
          )
        `)
        .in('campaign_id', campaignIds)
        .order('sent_at', { ascending: false })
        .limit(50);

      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching reminder history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'sent' ? 'success' : status === 'failed' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Reminder History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No reminders sent yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium">
                    {delivery.guests.first_name} {delivery.guests.last_name}
                  </TableCell>
                  <TableCell className="capitalize">{delivery.delivery_method}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {delivery.reminder_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      {getStatusBadge(delivery.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {delivery.sent_at
                      ? `${formatDisplayDate(delivery.sent_at)} ${formatDisplayTime(new Date(delivery.sent_at).toTimeString())}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};