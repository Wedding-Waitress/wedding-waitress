import React, { useMemo, useState } from 'react';
import { ListMusic, Trash2, ExternalLink, FileDown, LoaderCircle, Clock3, CircleCheck, CircleX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGuestSongRequests, type SongRequestStatus, type GuestSongRequestRow } from '@/hooks/useGuestSongRequests';
import { useGuestSongRequestSettings } from '@/hooks/useGuestSongRequestSettings';
import { exportGuestSongRequestsToPDF } from '@/lib/guestSongRequestsPdfExporter';

interface Props {
  eventId: string | null;
  eventName?: string | null;
  eventDate?: string | null;
}

const statusStyles: Record<SongRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
};

const statusLabel: Record<SongRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const GuestSongRequestsSection: React.FC<Props> = ({ eventId, eventName, eventDate }) => {
  const { settings } = useGuestSongRequestSettings(eventId);
  const { rows, loading, updateStatus, deleteRequest } = useGuestSongRequests(eventId);
  const [exporting, setExporting] = useState(false);

  const counts = useMemo(() => {
    const c = { total: rows.length, pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => { c[r.status]++; });
    return c;
  }, [rows]);

  const handleExport = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      await exportGuestSongRequestsToPDF({
        rows,
        eventName: eventName || 'Event',
        eventDate: eventDate || null,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border border-primary/40 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <ListMusic size={19} strokeWidth={1.8} className="text-[#856A4C]" aria-hidden="true" />
            Guest Song Requests
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/40">Total {counts.total}</Badge>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 inline-flex items-center gap-1.5"><Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />Pending {counts.pending}</Badge>
            <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 inline-flex items-center gap-1.5"><CircleCheck size={15} strokeWidth={1.8} aria-hidden="true" />Approved {counts.approved}</Badge>
            <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100 inline-flex items-center gap-1.5"><CircleX size={15} strokeWidth={1.8} aria-hidden="true" />Rejected {counts.rejected}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className="lv-premium-shade"
            >
              {exporting ? (
                <LoaderCircle size={16} strokeWidth={1.8} className="mr-1.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown size={16} strokeWidth={1.8} className="mr-1.5" aria-hidden="true" />
              )}
              {exporting ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </div>
        {!settings?.enabled && (
          <p className="text-xs text-muted-foreground pt-1">
            Guest song requests are currently turned off. Enable them under QR Code Seating Chart → Guest Live View Configuration.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-md p-6 text-center">
            No guest song requests yet. Once guests submit requests from the Live View app they will appear here in real time.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <RequestRow
                key={r.id}
                row={r}
                onStatusChange={(s) => updateStatus(r.id, s)}
                onDelete={() => deleteRequest(r.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RequestRow: React.FC<{
  row: GuestSongRequestRow;
  onStatusChange: (s: SongRequestStatus) => void;
  onDelete: () => void;
}> = ({ row, onStatusChange, onDelete }) => {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex-1 min-w-[240px] space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {row.song_title || <span className="italic text-muted-foreground">Untitled song</span>}
          </p>
          {row.artist_name && (
            <span className="text-sm text-muted-foreground">— {row.artist_name}</span>
          )}
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${statusStyles[row.status]}`}>
            {statusLabel[row.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Requested by <span className="font-medium text-foreground">{row.guest_name || 'Guest'}</span> · {new Date(row.created_at).toLocaleString()}
        </p>
        {row.music_link && (
          <a
            href={row.music_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline break-all"
          >
            <ExternalLink size={14} strokeWidth={1.8} /> {row.music_link}
          </a>
        )}
        {row.note && (
          <p className="text-xs text-foreground/80 italic">“{row.note}”</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select value={row.status} onValueChange={(v) => onStatusChange(v as SongRequestStatus)}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" title="Delete request" aria-label="Delete song request">
              <Trash2 size={16} strokeWidth={1.8} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this song request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the request from {row.guest_name || 'this guest'}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
