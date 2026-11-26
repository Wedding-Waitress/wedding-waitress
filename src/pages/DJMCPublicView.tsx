import { useDJMCRowTextSize } from '@/hooks/useDJMCRowTextSize';
import { DJMCRowTextSize } from '@/components/Dashboard/DJMCQuestionnaire/DJMCRowTextSize';
/**
 * DJ-MC Questionnaire Public View
 * Full feature parity with dashboard DJMCQuestionnairePage
 * Uses same DJMCQuestionnaireSection + DJMCSectionRow components
 * All mutations go through token-secured RPC functions
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Undo2, Music, AlertCircle, Download, Loader2, FileText, HeartHandshake, CalendarDays, Clock3, MapPin, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { DJMCSection, DJMCItem, SectionType } from '@/types/djMCQuestionnaire';
import { DEFAULT_SECTION_TEMPLATES } from '@/lib/djMCQuestionnaireTemplates';
import { exportEntireQuestionnairePDF, exportSectionPDF } from '@/lib/djMCQuestionnairePdfExporter';
import { DJMCQuestionnaireSection } from '@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection';
import { useDJMCUndo } from '@/hooks/useDJMCUndo';
import { Button } from '@/components/ui/button';
import { decodeShareToken, sameShareToken } from '@/lib/shareTokens';
import shared from './DJMCPublicView.module.css';
import { DJMCSharedGuestRequests } from './DJMCSharedGuestRequests';
import theme from '@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireTheme.module.css';
import { createCoalescedRead } from '@/lib/coalescedRead';
import { getCacheGeneration } from '@/lib/cacheRegistry';

interface PublicQuestionnaireData {
  questionnaire_id: string;
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
  permission: 'view_only' | 'can_edit';
  sections: DJMCSection[];
}

// Format date as "Saturday, 5th December 2026"
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

// Format time as "3:00 PM"
const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function DJMCPublicView() {
  const params = useParams<{ token: string; eventSlug?: string }>();
  const token = decodeShareToken(params.token || params.eventSlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicQuestionnaireData | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const undoWrites=useRef(new Set<Promise<unknown>>());
  const trackUndoWrite=async <T,>(request:PromiseLike<T>):Promise<T>=>{const p=Promise.resolve(request);undoWrites.current.add(p);try{return await p;}finally{undoWrites.current.delete(p);}};
  const prepareUndo=async()=>{Object.values(saveTimeoutRef.current).forEach(clearTimeout);saveTimeoutRef.current={};pendingSections.current={};pendingItems.current={};await Promise.allSettled([...undoWrites.current]);lastSaveRef.current=Date.now();};
  const fetchGeneration = useRef(0);
  const read = useRef(createCoalescedRead<any>());
  const dataRef = useRef(data); dataRef.current = data;
  const activeToken = useRef(token); activeToken.current = token;
  const pendingSections = useRef<Record<string, Partial<DJMCSection>>>({});
  const pendingItems = useRef<Record<string, Partial<DJMCItem>>>({});
  const writeChains = useRef(new Map<string, Promise<unknown>>());
  const queueWrite = (key: string, action: () => PromiseLike<unknown>) => {
    const previous = writeChains.current.get(key) || Promise.resolve();
    const next = previous.catch(() => undefined).then(action);
    writeChains.current.set(key, next);
    return next.finally(() => { if (writeChains.current.get(key) === next) writeChains.current.delete(key); });
  };
  const lastSaveRef = useRef<number>(0);

  const fetchData = useCallback(async (invalidate: unknown = false) => {
    if (!token) {
      setError('This share link is missing its secure token.');
      setData(null);
      setLoading(false);
      return;
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setError('This share link is malformed.');
      setData(null);
      setLoading(false);
      return;
    }

    const generation = ++fetchGeneration.current;
    setError(null);
    if (!dataRef.current) setLoading(true);

    try {
      const { data: result, error: fetchError } = await read.current(`${getCacheGeneration()}:${token}`, () => supabase.rpc(
        'get_dj_mc_questionnaire_by_token',
        { share_token: token }
      ), invalidate === true);

      if (generation !== fetchGeneration.current || activeToken.current !== token) return;
      if (Object.keys(saveTimeoutRef.current).length || undoWrites.current.size) return;
      if (fetchError) {
        console.error('Error fetching questionnaire:', fetchError);
        setError('This link is invalid, expired, or revoked.');
        setData(null);
        setLoading(false);
        return;
      }

      if (!result || result.length === 0) {
        setError('This link is invalid, expired, or revoked.');
        setData(null);
        setLoading(false);
        return;
      }

      const row = result[0];
      const parsedSections = ((row.sections as unknown as DJMCSection[]) || []).map(section => ({
        ...section, items: (section.items || []).map(item => ({ ...item, section_id: section.id })),
      }));
      
      setData({
        questionnaire_id: row.questionnaire_id,
        event_id: row.event_id,
        event_name: row.event_name,
        event_date: row.event_date,
        event_venue: row.event_venue,
        start_time: (row as any).start_time || null,
        finish_time: (row as any).finish_time || null,
        ceremony_date: (row as any).ceremony_date || null,
        ceremony_venue: (row as any).ceremony_venue || null,
        ceremony_start_time: (row as any).ceremony_start_time || null,
        ceremony_finish_time: (row as any).ceremony_finish_time || null,
        permission: row.permission as 'view_only' | 'can_edit',
        sections: parsedSections,
      });
    } catch (err) {
      if (generation !== fetchGeneration.current || activeToken.current !== token) return;
      console.error('Error:', err);
      setError('Failed to load questionnaire');
    } finally {
      if (generation === fetchGeneration.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setData(null);
    dataRef.current = null;
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    pendingSections.current = {};
    pendingItems.current = {};
    fetchData();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void fetchData(); }, 15000);
    window.addEventListener('focus', fetchData);
    return () => {
      ++fetchGeneration.current;
      clearInterval(timer);
      window.removeEventListener('focus', fetchData);
      Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    };
  }, [fetchData]);

  // Realtime subscription for live sync
  const realtimeSectionIds = data?.sections.map(section => section.id).sort().join('|') || '';
  useEffect(() => {
    if (!data?.questionnaire_id) return;
    const sectionIds = realtimeSectionIds.split('|').filter(Boolean);

    const channel = supabase
      .channel(`public-djmc:${data.questionnaire_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dj_mc_items',
      }, (payload) => {
        if (Date.now() - lastSaveRef.current < 2000) return;
        const changedSectionId = (payload.new as any)?.section_id || (payload.old as any)?.section_id;
        if (changedSectionId && sectionIds.includes(changedSectionId)) {
          fetchData(true);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dj_mc_sections',
      }, (payload) => {
        if (Date.now() - lastSaveRef.current < 2000) return;
        const changedQuestionnaireId = (payload.new as any)?.questionnaire_id || (payload.old as any)?.questionnaire_id;
        if (changedQuestionnaireId && changedQuestionnaireId !== dataRef.current?.questionnaire_id) return;
        fetchData(true);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dj_mc_share_tokens',
      }, (payload) => {
        if (payload.eventType === 'DELETE' && sameShareToken((payload.old as any)?.token, token)) {
          setData(null);
          setError('This link has been revoked.');
          return;
        }
        const updatedToken = payload.new as any;
        if (updatedToken && dataRef.current) {
          if (sameShareToken(updatedToken.token, token) && updatedToken.permission !== dataRef.current.permission) {
            setData(prev => prev ? { ...prev, permission: updatedToken.permission } : prev);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.questionnaire_id, realtimeSectionIds, token, fetchData]);

  const canEdit = data?.permission === 'can_edit';
  const { rowTextSize, setRowTextSize, loading: rowTextSizeLoading } = useDJMCRowTextSize(data?.event_id ?? null, token || undefined, canEdit);
  const undoHistory=useDJMCUndo({questionnaireId:data?.questionnaire_id,eventId:data?.event_id,sections:data?.sections||[],shareToken:token||undefined,canEdit,beforeRestore:prepareUndo,refresh:fetchData});

  // ── Token-secured mutation handlers ──

  const handleUpdateSection = useCallback((sectionId: string, updates: Partial<DJMCSection>) => {
    if (!token || !canEdit) return;
    
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
    });

    // Debounced save
    pendingSections.current[sectionId] = { ...pendingSections.current[sectionId], ...updates };
    const key = `section-${sectionId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      delete saveTimeoutRef.current[key];
      const updates = pendingSections.current[sectionId];
      delete pendingSections.current[sectionId];
      try {
        lastSaveRef.current = Date.now();
        const { error: saveError, data: saved }: any = await trackUndoWrite(queueWrite(`${token}:${key}`, () => (supabase.rpc as any)(updates.custom_columns ? 'update_dj_mc_section_by_token_v2' : 'update_dj_mc_section_by_token', {
          ...(updates.custom_columns ? {new_custom_columns:updates.custom_columns} : {}),
          share_token: token,
          p_section_id: sectionId,
          new_section_label: updates.section_label ?? null,
          new_notes: updates.notes ?? null,
          new_is_collapsed: updates.is_collapsed ?? null,
          clear_notes: updates.notes === null && 'notes' in updates,
        })));
        if (saveError || saved === false) throw saveError || new Error('Failed to save');
      } catch (err) {
        console.error('Error updating section:', err);
        fetchData();
      }
    }, 300);
  }, [token, canEdit, fetchData]);

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<DJMCItem>) => {
    if (!token || !canEdit) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          items: s.items.map(i =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        })),
      };
    });

    // Debounced save
    pendingItems.current[itemId] = { ...pendingItems.current[itemId], ...updates,
      ...(updates.custom_values ? { custom_values: { ...pendingItems.current[itemId]?.custom_values, ...updates.custom_values } } : {}),
    };
    const key = `item-${itemId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      delete saveTimeoutRef.current[key];
      const updates = pendingItems.current[itemId];
      delete pendingItems.current[itemId];
      try {
        lastSaveRef.current = Date.now();
        const { error: saveError, data: saved }: any = await trackUndoWrite(queueWrite(`${token}:${key}`, () => (supabase.rpc as any)(updates.custom_values ? 'update_dj_mc_item_by_token_v2' : 'update_dj_mc_item_by_token', {
          ...(updates.custom_values ? {new_custom_values:updates.custom_values} : {}),
          new_is_bold: updates.is_bold ?? null, new_is_italic: updates.is_italic ?? null,
          new_is_underline: updates.is_underline ?? null, new_is_section_header: updates.is_section_header ?? null,
          share_token: token,
          item_id: itemId,
          new_value_text: updates.value_text ?? null,
          new_music_url: updates.music_url ?? null,
          new_row_label: updates.row_label ?? null,
          new_song_title_artist: updates.song_title_artist ?? null,
          new_duration: updates.duration ?? null,
          new_pronunciation_audio_url: updates.pronunciation_audio_url ?? null,
        })));
        if (saveError || saved === false) throw saveError || new Error('Failed to save');
      } catch (err) {
        console.error('Error updating item:', err);
        fetchData();
      }
    }, 300);
  }, [token, canEdit, fetchData]);

  const handleAddItem = useCallback(async (sectionId: string) => {
    if (!token || !canEdit || !data) return;

    const section = data.sections.find(s => s.id === sectionId);
    const orderIndex = section ? section.items.length : 0;

    try {
      const { data: result, error: addError } = await supabase.rpc('add_dj_mc_item_by_token', {
        share_token: token,
        p_section_id: sectionId,
        p_row_label: 'New Item',
        at_order_index: orderIndex,
      });

      if (addError) throw addError;
      if (result) {
        const newItem = result as unknown as DJMCItem;
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map(s =>
              s.id === sectionId ? { ...s, items: s.items.some(i => i.id === newItem.id) ? s.items : [...s.items, newItem] } : s
            ),
          };
        });
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  }, [token, canEdit, data]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!token || !canEdit) return;

    // Optimistic
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          items: s.items.filter(i => i.id !== itemId),
        })),
      };
    });

    try {
      const { error: deleteError } = await supabase.rpc('delete_dj_mc_item_by_token', {
        share_token: token,
        item_id: itemId,
      });
      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting item:', err);
      fetchData(); // revert on failure
    }
  }, [token, canEdit, fetchData]);

  const handleDuplicateItem = useCallback(async (item: DJMCItem) => {
    if (!token || !canEdit) return;

    try {
      const { data: result, error: duplicateError } = await supabase.rpc('duplicate_dj_mc_item_by_token', {
        share_token: token,
        item_id: item.id,
      });

      if (duplicateError) throw duplicateError;
      if (result) {
        const newItem = result as unknown as DJMCItem;
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map(s =>
              s.id === item.section_id
                ? {
                    ...s,
                    items: [
                      ...s.items.slice(0, s.items.findIndex(i => i.id === item.id) + 1),
                      newItem,
                      ...s.items.slice(s.items.findIndex(i => i.id === item.id) + 1),
                    ],
                  }
                : s
            ),
          };
        });
      }
    } catch (err) {
      console.error('Error duplicating item:', err);
    }
  }, [token, canEdit]);

  const handleReorderItems = useCallback(async (sectionId: string, items: DJMCItem[]) => {
    if (!token || !canEdit) return;

    // Optimistic
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, items } : s
        ),
      };
    });

    try {
      const { error: reorderError } = await supabase.rpc('reorder_dj_mc_items_by_token', {
        share_token: token,
        p_section_id: sectionId,
        item_ids: items.map(i => i.id),
      });
      if (reorderError) throw reorderError;
    } catch (err) {
      console.error('Error reordering items:', err);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleResetToDefault = useCallback(async (sectionId: string) => {
    if (!token || !canEdit || !data) return;

    const section = data.sections.find(s => s.id === sectionId);
    if (!section) return;

    const template = DEFAULT_SECTION_TEMPLATES.find(t => t.section_type === section.section_type);
    if (!template) return;

    try {
      const defaultItems = template.items.map(item => ({ row_label: item.row_label }));
      const { error: resetError } = await supabase.rpc('reset_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
        p_default_label: template.section_label,
        p_default_items: defaultItems as any,
      });
      if (resetError) throw resetError;
      fetchData();
    } catch (err) {
      console.error('Error resetting section:', err);
    }
  }, [token, canEdit, data, fetchData]);

  const handleDuplicateSection = useCallback(async (sectionId: string) => {
    if (!token || !canEdit) return;

    try {
      const { data: result, error: duplicateError } = await supabase.rpc('duplicate_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
      });

      if (duplicateError) throw duplicateError;
      if (result) {
        fetchData(); // Full refetch to get correct ordering
      }
    } catch (err) {
      console.error('Error duplicating section:', err);
    }
  }, [token, canEdit, fetchData]);

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    if (!token || !canEdit) return;

    // Optimistic
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId),
      };
    });

    try {
      const { error: deleteError } = await supabase.rpc('delete_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
      });
      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting section:', err);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleDownloadPDF = async () => {
    if (!data) return;
    setDownloadingPDF(true);
    try {
      const eventData = {
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
      const questionnaireData = {
        id: data.questionnaire_id,
        sections: data.sections,
      };
      await exportEntireQuestionnairePDF(questionnaireData as any, eventData, rowTextSize);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadSectionPDF = async (section: DJMCSection) => {
    if (!data) return;
    try {
      const eventData = {
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
      await exportSectionPDF(section, eventData, rowTextSize);
    } catch (err) {
      console.error('Section PDF generation failed:', err);
    }
  };

  if (loading) {
    return (
      <div data-dashboard-content className={`${theme.page} ${shared.page} flex items-center justify-center`}>
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-muted-foreground ${theme.bodyText}`}>Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-dashboard-content className={`${theme.page} ${shared.page} flex items-center justify-center p-4`}>
        <Card className={`${theme.statusCard} max-w-md w-full`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className={`${theme.modalHeading} mb-2`}>Link Unavailable</h2>
            <p className={`text-muted-foreground mb-6 ${theme.bodyText}`}>{error}</p>
            <p className={`text-muted-foreground ${theme.bodyText}`}>
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-dashboard-content data-row-text-size={rowTextSize} className={`${theme.page} ${shared.page}`}>
      {/* Header */}
      <header className={`${theme.glassCard} mx-4 mt-4 rounded-xl print:static`}>
        <div className="w-full mx-auto px-4 py-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className={`text-muted-foreground ${theme.supportingText}`}>You have been invited to {canEdit ? 'edit' : 'view and download'} the DJ & MC questionnaire of</p>
                <h1 className={theme.pageHeading}>{data.event_name}</h1>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <DJMCRowTextSize value={rowTextSize} onChange={setRowTextSize} disabled={!canEdit || rowTextSizeLoading}/>
      {canEdit && <div className="flex print:hidden">
        <Button variant="ghost" className="gap-1.5" disabled={!undoHistory.canUndo||undoHistory.busy} onClick={undoHistory.undo}>
          {undoHistory.operation === 'restoring' ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Undo2 size={18} strokeWidth={1.8} aria-hidden="true"/>}
          {undoHistory.operation === 'restoring' ? 'Restoring…' : 'Undo'}
        </Button>
      </div>}

            </div>
            <div className="flex w-full flex-wrap items-center gap-2 print:hidden sm:w-auto sm:justify-end">
              <span className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 bg-transparent ${
                canEdit
                  ? 'border-green-500 text-green-600'
                  : 'border-red-500 text-red-500'
              }`}>
                {canEdit ? 'Can Edit' : 'View Only'}
              </span>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className={`${theme.primaryAction} inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-colors disabled:opacity-50`}
              >
                {downloadingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ceremony + Reception Event Details Banner */}
      <div className="w-full mx-auto px-4 pt-6">
            <div className={`${theme.eventBanner} text-center py-4 space-y-3`}>
              <h2 className="text-xl font-semibold text-primary">{data.event_name}</h2>

              {/* Ceremony & Reception Details */}
              <div className={`flex justify-center gap-8 flex-wrap ${
                !!data.ceremony_date && !!data.event_date ? '' : 'max-w-md mx-auto'
              }`}>
                {/* Ceremony Section */}
                {!!data.ceremony_date && (
                  <div className="text-left min-w-[280px] max-lg:min-w-0 max-lg:w-full max-sm:text-center">
                    <div className="flex items-center gap-1.5 max-sm:justify-center">
                      <HeartHandshake size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${theme.eventDetailLabel}`}>Ceremony:</span>
                      <span className={`text-muted-foreground inline-flex items-center gap-1 ${theme.eventDetailText}`}>
                        <CalendarDays size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {formatFullDate(data.ceremony_date)}
                      </span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Start: {formatTimeDisplay(data.ceremony_start_time)} — Finish: {formatTimeDisplay(data.ceremony_finish_time)}
                    </div>
                    {data.ceremony_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {data.ceremony_venue}
                      </div>
                    )}
                  </div>
                )}

                {/* Reception Section */}
                {!!data.event_date && (
                  <div className="text-left min-w-[280px] max-lg:min-w-0 max-lg:w-full max-sm:text-center">
                    <div className="flex items-center gap-1.5 max-sm:justify-center">
                      <PartyPopper size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${theme.eventDetailLabel}`}>Reception:</span>
                      <span className={`text-muted-foreground inline-flex items-center gap-1 ${theme.eventDetailText}`}>
                        <CalendarDays size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {formatFullDate(data.event_date)}
                      </span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      Start: {formatTimeDisplay(data.start_time)} — Finish: {formatTimeDisplay(data.finish_time)}
                    </div>
                    {data.event_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 max-sm:justify-center ${theme.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        {data.event_venue}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

      </div>

      {undoHistory.busy && <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[#967a59] bg-[#fff4e5] px-5 py-3 text-[#2f1b14] shadow-lg">
        <Loader2 size={20} className="animate-spin" aria-hidden="true"/>
        {undoHistory.operation === 'restoring' ? 'Restoring questionnaire… Please keep this page open.' : 'Saving changes… Please wait.'}
      </div>}
      {/* Main Content — Uses same DJMCQuestionnaireSection as dashboard */}
      <main className="w-full mx-auto px-4 py-6">
        <div className="space-y-4 max-lg:space-y-5 max-sm:space-y-6">
          {data.sections.map((section) => (
            <DJMCQuestionnaireSection
              key={section.id}
              section={section}
              onRunUndoable={undoHistory.run}
              eventId={data.event_id}
              shareToken={token || undefined}
              onUpdateSection={(updates) => undoHistory.record(() => handleUpdateSection(section.id, updates))}
              onUpdateItem={(itemId, updates) => undoHistory.record(() => handleUpdateItem(itemId, updates))}
              onAddItem={() => undoHistory.run(() => handleAddItem(section.id))}
              onDeleteItem={(itemId) => undoHistory.run(() => handleDeleteItem(itemId))}
              onDuplicateItem={(item) => undoHistory.run(() => handleDuplicateItem(item))}
              onReorderItems={(items) => undoHistory.run(() => handleReorderItems(section.id, items))}
              onResetToDefault={() => undoHistory.run(() => handleResetToDefault(section.id))}
              onDuplicateSection={() => undoHistory.run(() => handleDuplicateSection(section.id))}
              onDeleteSection={() => undoHistory.run(() => handleDeleteSection(section.id))}
              onDownloadSectionPDF={() => handleDownloadSectionPDF(section)}
              disabled={!canEdit||undoHistory.busy}
            />
          ))}
          
          <DJMCSharedGuestRequests key={token} token={token!} eventId={data.event_id} eventName={data.event_name} eventDate={data.event_date} canEdit={canEdit && !undoHistory.busy} onRunUndoable={(action,rows)=>undoHistory.run(action,false,rows)}/>
          {data.sections.length === 0 && (
            <Card className={theme.statusCard}>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className={theme.bodyText}>No sections have been added to this questionnaire yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`${theme.publicFooter} border-t mt-12 print:border-0`}>
        <div className="w-full mx-auto px-4 py-6 text-center">
          <a href="https://www.weddingwaitress.com.au" target="_blank" rel="noopener noreferrer" className="inline-block mb-2">
            <img 
              src="/wedding-waitress-document-footer-print.png" 
              alt="Wedding Waitress" 
              className="h-10 mx-auto"
            />
          </a>
          <a href="https://www.weddingwaitress.com.au" target="_blank" rel="noopener noreferrer" className={`block text-muted-foreground hover:text-foreground transition-colors ${theme.bodyText}`}>
            Powered by Wedding Waitress
          </a>
        </div>
      </footer>
    </div>
  );
}
