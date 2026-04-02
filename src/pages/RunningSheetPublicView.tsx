import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, AlertCircle, Download, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { exportRunningSheetPDF } from '@/lib/runningSheetPdfExporter';
import { RunningSheetSection } from '@/components/Dashboard/RunningSheet/RunningSheetSection';
import { RunningSheetItem } from '@/types/runningSheet';

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

const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function RunningSheetPublicView() {
  const params = useParams<{ token: string; eventSlug?: string }>();
  const token = params.token || params.eventSlug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RunningSheetData | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Running Sheet');
  const [sectionNotes, setSectionNotes] = useState<string | null>(null);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSaveRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for live sync — items
  useEffect(() => {
    if (!data?.sheet_id) return;
    const channel = supabase
      .channel(`public-rs-items:${data.sheet_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'running_sheet_items',
        filter: `sheet_id=eq.${data.sheet_id}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.sheet_id, fetchData]);

  // Realtime subscription for permission changes on share tokens
  useEffect(() => {
    if (!data?.sheet_id) return;
    const channel = supabase
      .channel(`public-rs-tokens:${data.sheet_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'running_sheet_share_tokens',
        filter: `sheet_id=eq.${data.sheet_id}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.sheet_id, fetchData]);

  const canEdit = data?.permission === 'can_edit';

  // --- Token-based write operations ---

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    if (!token || !canEdit) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      };
    });

    // Debounced save
    const key = `update-${itemId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);

    saveTimeoutRef.current[key] = setTimeout(async () => {
      const params: any = { share_token: token, item_id: itemId };
      if (updates.time_text !== undefined) params.new_time_text = updates.time_text;
      if (updates.description_rich !== undefined) params.new_description_rich = updates.description_rich;
      if (updates.responsible !== undefined) params.new_responsible = updates.responsible;
      if (updates.is_section_header !== undefined) params.new_is_section_header = updates.is_section_header;
      if (updates.is_bold !== undefined) params.new_is_bold = updates.is_bold;
      if (updates.is_italic !== undefined) params.new_is_italic = updates.is_italic;
      if (updates.is_underline !== undefined) params.new_is_underline = updates.is_underline;

      const { data: success, error: rpcError } = await supabase.rpc('update_running_sheet_item_by_token', params);
      if (rpcError) {
        console.error('Error saving item:', rpcError);
      } else if (success === false) {
        console.error('Save rejected — token may no longer have edit permission');
        fetchData();
      }
    }, 600);
  }, [token, canEdit, fetchData]);

  const handleAddItem = useCallback(async () => {
    if (!token || !canEdit || !data) return;
    const nextIndex = data.items.length;
    const { data: newRow, error: rpcError } = await supabase.rpc('add_running_sheet_item_by_token', {
      share_token: token,
      at_order_index: nextIndex,
    });
    if (rpcError) {
      console.error('Error adding item:', rpcError);
      return;
    }
    if (newRow) {
      // Realtime will pick it up, but also do optimistic add
      fetchData();
    }
  }, [token, canEdit, data, fetchData]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!token || !canEdit) return;
    // Optimistic removal
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter(i => i.id !== itemId) };
    });
    const { error: rpcError } = await supabase.rpc('delete_running_sheet_item_by_token', {
      share_token: token,
      item_id: itemId,
    });
    if (rpcError) {
      console.error('Error deleting item:', rpcError);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleDuplicateItem = useCallback(async (item: RunningSheetItem) => {
    if (!token || !canEdit) return;
    const { data: newRow, error: rpcError } = await supabase.rpc('duplicate_running_sheet_item_by_token', {
      share_token: token,
      item_id: item.id,
    });
    if (rpcError) {
      console.error('Error duplicating item:', rpcError);
      return;
    }
    if (newRow) {
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleReorderItems = useCallback(async (reorderedItems: RunningSheetItem[]) => {
    if (!token || !canEdit) return;
    // Optimistic reorder
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, items: reorderedItems };
    });
    const itemIds = reorderedItems.map(i => i.id);
    const { error: rpcError } = await supabase.rpc('reorder_running_sheet_items_by_token', {
      share_token: token,
      item_ids: itemIds,
    });
    if (rpcError) {
      console.error('Error reordering items:', rpcError);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleResetToDefault = useCallback(() => {
    // In public view, reset = delete all rows (no default template knowledge)
    if (!data) return;
    data.items.forEach(item => handleDeleteItem(item.id));
  }, [data, handleDeleteItem]);

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

  const hasCeremony = !!(data.ceremony_date || data.ceremony_venue);
  const hasReception = !!(data.event_date || data.event_venue);

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
                <p className="text-sm text-muted-foreground">You have been invited to {canEdit ? 'edit' : 'view and download'} the running sheet of</p>
                <h1 className="text-xl font-bold">{data.event_name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <span className={`inline-flex items-center px-4 py-2 text-sm font-medium border-2 rounded-full ${
                canEdit
                  ? 'border-amber-500 text-amber-600'
                  : 'border-red-500 text-red-500'
              }`}>
                {canEdit ? 'Can Edit' : 'View Only'}
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
                    await exportRunningSheetPDF(data.items as any, eventObj, sectionLabel, sectionNotes);
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

      {/* Event Info Banner — matching dashboard layout */}
      {(hasCeremony || hasReception) && (
        <div className="bg-primary/5 border-b border-primary/10 print:bg-transparent">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-primary">{data.event_name}</h2>
              <div className={`flex justify-center gap-8 flex-wrap ${
                hasCeremony && hasReception ? '' : 'max-w-md mx-auto'
              }`}>
                {hasCeremony && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Ceremony:</span>
                      <span className="ml-2 text-muted-foreground">{formatFullDate(data.ceremony_date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(data.ceremony_start_time)} — Finish: {formatTimeDisplay(data.ceremony_finish_time)}
                    </div>
                    {data.ceremony_venue && <div className="text-sm text-muted-foreground">{data.ceremony_venue}</div>}
                  </div>
                )}
                {hasReception && (
                  <div className="text-left min-w-[280px]">
                    <div>
                      <span className="font-semibold text-primary">Reception:</span>
                      <span className="ml-2 text-muted-foreground">{formatFullDate(data.event_date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {formatTimeDisplay(data.start_time)} — Finish: {formatTimeDisplay(data.finish_time)}
                    </div>
                    {data.event_venue && <div className="text-sm text-muted-foreground">{data.event_venue}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Running Sheet — using same components as dashboard */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <RunningSheetSection
          label={sectionLabel}
          onLabelChange={setSectionLabel}
          notes={sectionNotes}
          onNotesChange={setSectionNotes}
          items={data.items}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          onReorderItems={handleReorderItems}
          onResetToDefault={handleResetToDefault}
          hasDJMCData={false}
          disabled={!canEdit}
        />
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
