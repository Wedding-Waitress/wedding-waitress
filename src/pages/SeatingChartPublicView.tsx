import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { exportFullSeatingChartToPdf } from '@/lib/fullSeatingChartPdfExporter';
import { FileText, Eye } from 'lucide-react';

interface SharedGuest {
  id: string;
  first_name: string;
  last_name: string | null;
  table_no: number | null;
  seat_no: number | null;
  dietary: string | null;
  relation_display: string;
  rsvp: string | null;
}

interface SharedData {
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_venue: string | null;
  permission: string;
  guests: SharedGuest[];
}

export function SeatingChartPublicView() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data: result, error: err } = await supabase.rpc('get_seating_chart_by_token' as any, {
        share_token: decodeURIComponent(token),
      });

      if (err || !result || (Array.isArray(result) && result.length === 0)) {
        setError('This link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const row = Array.isArray(result) ? result[0] : result;
      setData({
        event_id: row.event_id,
        event_name: row.event_name,
        event_date: row.event_date,
        event_venue: row.event_venue,
        permission: row.permission,
        guests: typeof row.guests === 'string' ? JSON.parse(row.guests) : row.guests || [],
      });
      setLoading(false);
    })();
  }, [token]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const fakeEvent = { name: data.event_name, date: data.event_date, venue: data.event_venue } as any;
      const defaultSettings = {
        fontSize: 'medium' as const,
        sortBy: 'firstName' as const,
        showDietary: false,
        showRelation: false,
        showRsvp: false,
        showLogo: true,
        paperSize: 'A4' as const,
      };
      await exportFullSeatingChartToPdf(fakeEvent, data.guests as any, defaultSettings);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">Link Invalid</h1>
          <p className="text-muted-foreground">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b p-6 text-center space-y-4">
        <p className="text-muted-foreground text-sm">
          You have been invited to view and download the full seating chart of
        </p>
        <h1 className="text-2xl font-bold text-foreground">{data.event_name}</h1>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border-2 border-destructive rounded-full text-destructive bg-background cursor-default"
            disabled
          >
            <Eye className="w-4 h-4" />
            View Only
          </button>
          <button
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50"
            onClick={handleDownloadPdf}
            disabled={exporting}
          >
            <FileText className="w-4 h-4" />
            {exporting ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Guest Table */}
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Guest Name</th>
                <th className="text-center p-3 font-medium">Table</th>
                <th className="text-center p-3 font-medium">Seat</th>
              </tr>
            </thead>
            <tbody>
              {data.guests.map((guest) => (
                <tr key={guest.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3">{guest.first_name} {guest.last_name || ''}</td>
                  <td className="p-3 text-center">{guest.table_no ?? '—'}</td>
                  <td className="p-3 text-center">{guest.seat_no ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t p-6 text-center space-y-2">
        <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="inline-block">
          <img src="/wedding-waitress-share-logo.png" alt="Wedding Waitress" className="h-10 mx-auto" />
        </a>
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="underline">
            Wedding Waitress
          </a>
        </p>
      </footer>
    </div>
  );
}
