/**
 * DJ-MC Questionnaire Public View
 * Full feature parity with dashboard DJMCQuestionnairePage
 * Uses same DJMCQuestionnaireSection + DJMCSectionRow components
 * All mutations go through token-secured RPC functions
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Music, AlertCircle, Download, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { DJMCSection, DJMCItem, SectionType } from '@/types/djMCQuestionnaire';
import { DEFAULT_SECTION_TEMPLATES } from '@/lib/djMCQuestionnaireTemplates';
import { exportEntireQuestionnairePDF, exportSectionPDF } from '@/lib/djMCQuestionnairePdfExporter';
import { DJMCQuestionnaireSection } from '@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection';

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
  const token = params.token || params.eventSlug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicQuestionnaireData | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
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
        'get_dj_mc_questionnaire_by_token',
        { share_token: token }
      );

      if (fetchError) {
        console.error('Error fetching questionnaire:', fetchError);
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
      const parsedSections = (row.sections as unknown as DJMCSection[]) || [];
      
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
      console.error('Error:', err);
      setError('Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for live sync
  useEffect(() => {
    if (!data?.questionnaire_id) return;
    const sectionIds = data.sections.map(s => s.id);

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
          fetchData();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dj_mc_sections',
      }, () => {
        if (Date.now() - lastSaveRef.current < 2000) return;
        fetchData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dj_mc_share_tokens',
      }, (payload) => {
        const updatedToken = payload.new as any;
        if (updatedToken && data) {
          const tokenMatches = updatedToken.token === token || 
            updatedToken.token === token + '=' || 
            updatedToken.token === token + '==';
          if (tokenMatches && updatedToken.permission !== data.permission) {
            setData(prev => prev ? { ...prev, permission: updatedToken.permission } : prev);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.questionnaire_id, data?.sections, data?.permission, token, fetchData]);

  const canEdit = data?.permission === 'can_edit';

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
    const key = `section-${sectionId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      try {
        lastSaveRef.current = Date.now();
        await supabase.rpc('update_dj_mc_section_by_token', {
          share_token: token,
          p_section_id: sectionId,
          new_section_label: updates.section_label ?? null,
          new_notes: updates.notes ?? null,
          new_is_collapsed: updates.is_collapsed ?? null,
          clear_notes: updates.notes === null && 'notes' in updates,
        });
      } catch (err) {
        console.error('Error updating section:', err);
      }
    }, 300);
  }, [token, canEdit]);

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
    const key = `item-${itemId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      try {
        lastSaveRef.current = Date.now();
        await supabase.rpc('update_dj_mc_item_by_token', {
          share_token: token,
          item_id: itemId,
          new_value_text: updates.value_text ?? null,
          new_music_url: updates.music_url ?? null,
          new_row_label: updates.row_label ?? null,
          new_song_title_artist: updates.song_title_artist ?? null,
          new_duration: updates.duration ?? null,
          new_pronunciation_audio_url: updates.pronunciation_audio_url ?? null,
        });
      } catch (err) {
        console.error('Error updating item:', err);
      }
    }, 300);
  }, [token, canEdit]);

  const handleAddItem = useCallback(async (sectionId: string) => {
    if (!token || !canEdit || !data) return;

    const section = data.sections.find(s => s.id === sectionId);
    const orderIndex = section ? section.items.length : 0;

    try {
      const { data: result } = await supabase.rpc('add_dj_mc_item_by_token', {
        share_token: token,
        p_section_id: sectionId,
        p_row_label: 'New Item',
        at_order_index: orderIndex,
      });

      if (result) {
        const newItem = result as unknown as DJMCItem;
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map(s =>
              s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s
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
      await supabase.rpc('delete_dj_mc_item_by_token', {
        share_token: token,
        item_id: itemId,
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      fetchData(); // revert on failure
    }
  }, [token, canEdit, fetchData]);

  const handleDuplicateItem = useCallback(async (item: DJMCItem) => {
    if (!token || !canEdit) return;

    try {
      const { data: result } = await supabase.rpc('duplicate_dj_mc_item_by_token', {
        share_token: token,
        item_id: item.id,
      });

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
      await supabase.rpc('reorder_dj_mc_items_by_token', {
        share_token: token,
        p_section_id: sectionId,
        item_ids: items.map(i => i.id),
      });
    } catch (err) {
      console.error('Error reordering items:', err);
    }
  }, [token, canEdit]);

  const handleResetToDefault = useCallback(async (sectionId: string) => {
    if (!token || !canEdit || !data) return;

    const section = data.sections.find(s => s.id === sectionId);
    if (!section) return;

    const template = DEFAULT_SECTION_TEMPLATES.find(t => t.section_type === section.section_type);
    if (!template) return;

    try {
      const defaultItems = template.items.map(item => ({ row_label: item.row_label }));
      await supabase.rpc('reset_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
        p_default_label: template.section_label,
        p_default_items: defaultItems as any,
      });
      fetchData();
    } catch (err) {
      console.error('Error resetting section:', err);
    }
  }, [token, canEdit, data, fetchData]);

  const handleDuplicateSection = useCallback(async (sectionId: string) => {
    if (!token || !canEdit) return;

    try {
      const { data: result } = await supabase.rpc('duplicate_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
      });

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
      await supabase.rpc('delete_dj_mc_section_by_token', {
        share_token: token,
        p_section_id: sectionId,
      });
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
      await exportEntireQuestionnairePDF(questionnaireData as any, eventData);
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
      await exportSectionPDF(section, eventData);
    } catch (err) {
      console.error('Section PDF generation failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questionnaire...</p>
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
        <div className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{data.event_name}</h1>
                <p className="text-sm text-muted-foreground">DJ-MC Questionnaire</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 border-green-500 text-green-600 bg-transparent hover:bg-green-50 transition-colors disabled:opacity-50"
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
      <div className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] pt-6">
        <div className="text-center py-4 border-b border-border space-y-3">
          <h2 className="text-xl font-semibold text-primary">{data.event_name}</h2>
          
          <div className="flex justify-center gap-8 flex-wrap">
            {/* Ceremony Section */}
            {data.ceremony_date && (
              <div className="text-left min-w-[280px]">
                <div>
                  <span className="font-semibold text-primary">Ceremony:</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatFullDate(data.ceremony_date)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Start: {formatTimeDisplay(data.ceremony_start_time)} — Finish: {formatTimeDisplay(data.ceremony_finish_time)}
                </div>
                {data.ceremony_venue && (
                  <div className="text-sm text-muted-foreground">
                    {data.ceremony_venue}
                  </div>
                )}
              </div>
            )}
            
            {/* Reception Section */}
            {data.event_date && (
              <div className="text-left min-w-[280px]">
                <div>
                  <span className="font-semibold text-primary">Reception:</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatFullDate(data.event_date)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Start: {formatTimeDisplay(data.start_time)} — Finish: {formatTimeDisplay(data.finish_time)}
                </div>
                {data.event_venue && (
                  <div className="text-sm text-muted-foreground">
                    {data.event_venue}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content — Uses same DJMCQuestionnaireSection as dashboard */}
      <main className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-6">
        <div className="space-y-4">
          {data.sections.map((section) => (
            <DJMCQuestionnaireSection
              key={section.id}
              section={section}
              onUpdateSection={(updates) => handleUpdateSection(section.id, updates)}
              onUpdateItem={(itemId, updates) => handleUpdateItem(itemId, updates)}
              onAddItem={() => handleAddItem(section.id)}
              onDeleteItem={(itemId) => handleDeleteItem(itemId)}
              onDuplicateItem={(item) => handleDuplicateItem(item)}
              onReorderItems={(items) => handleReorderItems(section.id, items)}
              onResetToDefault={() => handleResetToDefault(section.id)}
              onDuplicateSection={() => handleDuplicateSection(section.id)}
              onDeleteSection={() => handleDeleteSection(section.id)}
              onDownloadSectionPDF={() => handleDownloadSectionPDF(section)}
              disabled={!canEdit}
            />
          ))}
          
          {data.sections.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sections have been added to this questionnaire yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 print:border-0">
        <div className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-6 text-center">
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="inline-block mb-2">
            <img 
              src="/wedding-waitress-share-logo.png" 
              alt="Wedding Waitress" 
              className="h-10 mx-auto"
            />
          </a>
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
            Powered by Wedding Waitress
          </a>
        </div>
      </footer>
    </div>
  );
}
