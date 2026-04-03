import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { exportFullSeatingChartToPdf } from '@/lib/fullSeatingChartPdfExporter';
import { FileText, Eye } from 'lucide-react';

interface SharedGuest {
  id: string;
  first_name: string;
  last_name: string | null;
  table_no: number | null;
  table_name: string | null;
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

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatDateWithOrdinal = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinal = getOrdinalSuffix(day);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${weekday} ${day}${ordinal}, ${month} ${year}`;
  } catch {
    return dateString;
  }
};

const formatGeneratedTimestamp = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} Time: ${timeStr}`;
};

// Format table display - use table_name if it's a text name, otherwise show Table #
const formatTableDisplay = (guest: SharedGuest): string => {
  if (!guest.table_no) return 'Unassigned';
  if (guest.table_name && isNaN(Number(guest.table_name))) return guest.table_name;
  return `Table ${guest.table_no}`;
};

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

  // Pagination: match the PDF exporter (10 per column, 20 per page)
  const pages = useMemo(() => {
    if (!data) return [];
    const GUESTS_PER_COLUMN = 10;
    const GUESTS_PER_PAGE = GUESTS_PER_COLUMN * 2;
    const result: { guests: SharedGuest[]; col1Count: number; startIndex: number; endIndex: number }[] = [];
    for (let i = 0; i < data.guests.length; i += GUESTS_PER_PAGE) {
      const pageGuests = data.guests.slice(i, i + GUESTS_PER_PAGE);
      const col1Count = Math.min(GUESTS_PER_COLUMN, pageGuests.length);
      result.push({ guests: pageGuests, col1Count, startIndex: i, endIndex: i + pageGuests.length });
    }
    return result;
  }, [data]);

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
      // Build tableNameMap from guest data
      const tnMap: Record<number, string> = {};
      data.guests.forEach(g => {
        if (g.table_no != null && g.table_name && isNaN(Number(g.table_name))) {
          tnMap[g.table_no] = g.table_name;
        }
      });
      await exportFullSeatingChartToPdf(fakeEvent, data.guests as any, defaultSettings, undefined, undefined, tnMap);
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

  const totalPages = pages.length || 1;

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

      {/* A4 Pages */}
      <div className="flex-1 p-6 space-y-8">
        {pages.map((pageInfo, pageIndex) => {
          const col1 = pageInfo.guests.slice(0, pageInfo.col1Count);
          const col2 = pageInfo.guests.slice(pageInfo.col1Count);
          const leftStart = pageInfo.startIndex + 1;
          const leftEnd = pageInfo.startIndex + pageInfo.col1Count;
          const rightStart = pageInfo.startIndex + pageInfo.col1Count + 1;
          const rightEnd = pageInfo.endIndex;

          return (
            <div key={pageIndex} className="flex justify-center">
              <div
                className="bg-white border border-gray-300 shadow-lg"
                style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}
              >
                <div style={{ padding: '12mm' }} className="flex flex-col" >
                  {/* Page Header */}
                  <div className="text-center mb-3">
                    <h2 className="text-lg font-bold mb-0.5" style={{ color: '#7C3AED' }}>
                      {data.event_name}
                    </h2>
                    <p className="text-sm font-bold text-black mb-0.5">
                      Full Seating Chart - {data.event_date && formatDateWithOrdinal(data.event_date)}
                    </p>
                    <p className="text-xs text-black pb-2 mb-2 border-b border-black">
                      {data.event_venue} - Total Guests: {data.guests.length} - Page {pageIndex + 1} of {totalPages} - Generated on: {formatGeneratedTimestamp()}
                    </p>
                  </div>

                  {/* Two-column guest list */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '12mm' }}>
                    {/* Left Column */}
                    <div>
                      {col1.length > 0 && (
                        <>
                          <h3 className="font-bold text-xs text-black uppercase tracking-wide mb-2">
                            GUESTS {leftStart}-{leftEnd}
                          </h3>
                          <div className="space-y-1">
                            {col1.map((guest) => (
                              <GuestRow key={guest.id} guest={guest} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column */}
                    <div>
                      {col2.length > 0 && (
                        <>
                          <h3 className="font-bold text-xs text-black uppercase tracking-wide mb-2">
                            GUESTS {rightStart}-{rightEnd}
                          </h3>
                          <div className="space-y-1">
                            {col2.map((guest) => (
                              <GuestRow key={guest.id} guest={guest} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Page Footer Logo */}
                  <div className="flex justify-center mt-auto pt-6">
                    <img
                      src="/wedding-waitress-share-logo.png"
                      alt="Wedding Waitress"
                      style={{ height: '10.5mm', width: 'auto' }}
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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

/** Read-only guest row matching PDF layout: checkbox ☐ + bold name + table badge */
function GuestRow({ guest }: { guest: SharedGuest }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 px-0.5">
      <span className="text-sm font-mono flex-shrink-0" style={{ color: '#7C3AED' }}>☐</span>
      <span className="text-sm font-bold text-black flex-1 min-w-0 truncate">
        {guest.first_name}
      </span>
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
        style={{ backgroundColor: '#f3f4f6', color: '#000' }}
      >
        {guest.table_no ? `Table ${guest.table_no}` : 'Unassigned'}
      </span>
    </div>
  );
}
