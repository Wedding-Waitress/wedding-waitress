import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, AlertCircle, Download, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportRunningSheetPDF } from '@/lib/runningSheetPdfExporter';

interface RunningSheetData {
  sheet_id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  ceremony_date: string | null;
  ceremony_venue: string | null;
  ceremony_start_time: string | null;
  ceremony_finish_time: string | null;
  permission: string;
  items: RunningSheetItem[];
}

interface RunningSheetItem {
  id: string;
  time_text: string;
  description_rich: any;
  responsible: string | null;
  order_index: number;
  is_section_header: boolean;
  is_bold?: boolean;
  is_italic?: boolean;
  is_underline?: boolean;
}

const formatFullDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

/** Build display text from description_rich ({ text, bullets, subText } format) */
const buildEventDisplay = (rich: any): string => {
  if (!rich) return '';
  if (typeof rich === 'string') return rich;
  const parts: string[] = [];
  if (rich.text) parts.push(rich.text);
  if (Array.isArray(rich.bullets)) {
    rich.bullets.forEach((b: string) => parts.push('• ' + b));
  }
  if (rich.subText) parts.push(rich.subText);
  return parts.join('\n');
};

export function RunningSheetPublicView() {
  const params = useParams<{ token: string; eventSlug?: string }>();
  // When using /running-sheet/:eventSlug/:token, React Router puts eventSlug in first param and token in second.
  // When using /running-sheet/:token (old links), token is in the first param.
  const token = params.token || params.eventSlug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RunningSheetData | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }
      try {
        const { data: result, error: fetchError } = await supabase.rpc(
          'get_running_sheet_by_token',
          { share_token: token }
        );
        if (fetchError) {
          console.error('Error fetching running sheet:', fetchError);
          setError('This link is invalid or has expired');
          setLoading(false);
          return;
        }
        if (!result || result.length === 0) {
          setError('This link is invalid or has expired');
          setLoading(false);
          return;
        }
        const row = result[0];
        const parsedItems = (row.items as unknown as RunningSheetItem[]) || [];
        parsedItems.sort((a, b) => a.order_index - b.order_index);

        setData({
          sheet_id: row.sheet_id,
          event_id: row.event_id,
          event_name: row.event_name,
          event_date: row.event_date,
          event_venue: row.event_venue,
          start_time: row.start_time,
          finish_time: row.finish_time,
          ceremony_date: row.ceremony_date,
          ceremony_venue: row.ceremony_venue,
          ceremony_start_time: row.ceremony_start_time,
          ceremony_finish_time: row.ceremony_finish_time,
          permission: row.permission,
          items: parsedItems,
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load running sheet');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading running sheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 print:static">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">You have been invited to view and download the running sheet of</p>
                <h1 className="text-xl font-bold">{data.event_name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <span className="inline-flex items-center px-4 py-2 text-sm font-medium border-2 border-red-500 rounded-full text-red-500">
                View Only
              </span>
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium border-2 border-green-500 rounded-full text-green-600 bg-transparent hover:bg-green-50 transition-colors disabled:opacity-50"
                disabled={downloadingPDF}
                onClick={async () => {
                  setDownloadingPDF(true);
                  try {
                    const eventObj = {
                      id: data.event_id,
                      name: data.event_name,
                      date: data.event_date,
                      venue: data.event_venue,
                      start_time: data.start_time,
                      finish_time: data.finish_time,
                      ceremony_date: data.ceremony_date,
                      ceremony_venue: data.ceremony_venue,
                      ceremony_start_time: data.ceremony_start_time,
                      ceremony_finish_time: data.ceremony_finish_time,
                    };
                    await exportRunningSheetPDF(data.items as any, eventObj, 'Running Sheet', null);
                  } catch (err) {
                    console.error('PDF export error:', err);
                  } finally {
                    setDownloadingPDF(false);
                  }
                }}
              >
                {downloadingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Event Info Banner */}
      <div className="bg-primary/5 border-b border-primary/10 print:bg-transparent">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            {data.event_date && (
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {formatFullDate(data.event_date)}
              </div>
            )}
            {data.event_venue && (
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {data.event_venue}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Running Sheet Table */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-[120px]">Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Event</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-[150px]">Who</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => {
                    const description = buildEventDisplay(item.description_rich);
                    const isSectionHeader = item.is_section_header;

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border last:border-0 ${
                          isSectionHeader ? 'bg-muted/30' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        }`}
                      >
                        <td
                          className={`px-4 py-3 align-top whitespace-nowrap ${
                            isSectionHeader ? 'font-bold text-destructive' : 'text-foreground'
                          }`}
                        >
                          {item.time_text}
                        </td>
                        <td
                          className={`px-4 py-3 align-top whitespace-pre-wrap ${
                            isSectionHeader ? 'font-bold text-foreground' : 'text-foreground'
                          }`}
                        >
                          {description}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {item.responsible || ''}
                        </td>
                      </tr>
                    );
                  })}
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                        No items in this running sheet yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 print:border-0">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <img
              src="/wedding-waitress-share-logo.png"
              alt="Wedding Waitress"
              className="h-10 w-auto"
            />
            <p className="text-xs text-muted-foreground">
              Powered by Wedding Waitress
            </p>
          </a>
        </div>
      </footer>
    </div>
  );
}
