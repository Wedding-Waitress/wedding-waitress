/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import {textUndoUpdates} from '@/lib/djmcTextUndo';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJMCQuestionnaire, DJMCSection, DJMCItem, DJMCShareToken, SectionType } from '@/types/djMCQuestionnaire';
import { DEFAULT_SECTION_TEMPLATES, SECTION_ORDER } from '@/lib/djMCQuestionnaireTemplates';
import { getCacheGeneration, registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { createCoalescedRead } from '@/lib/coalescedRead';

// Self-save cooldown: ignore realtime events within this window after a local save
const SELF_SAVE_COOLDOWN_MS = 2000;

// Module-level cache for instant loading when returning to the page
const questionnaireCache = new Map<string, DJMCQuestionnaire>();
const shareTokensCache = new Map<string, DJMCShareToken[]>();
registerCache(() => { questionnaireCache.clear(); shareTokensCache.clear(); });
registerEventCache((eventId) => { questionnaireCache.delete(eventId); shareTokensCache.delete(eventId); });

export function useDJMCQuestionnaire(eventId: string | null) {
  const [questionnaire, setQuestionnaire] = useState<DJMCQuestionnaire | null>(
    eventId ? questionnaireCache.get(eventId) ?? null : null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareTokens, setShareTokens] = useState<DJMCShareToken[]>(
    eventId ? shareTokensCache.get(eventId) ?? [] : []
  );
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Self-save guard: tracks last local save timestamp
  const lastSaveRef = useRef<number>(0);
  const read = useRef(createCoalescedRead<void>());
  const currentEvent = useRef(eventId); currentEvent.current = eventId;
  const questionnaireRef=useRef(questionnaire);questionnaireRef.current=questionnaire;
  const writeQueue=useRef<Promise<unknown>>(Promise.resolve());
  const undoWrites = useRef(new Set<Promise<unknown>>());
  const trackUndoWrite = async <T,>(request: PromiseLike<T>): Promise<T> => {
    const promise=Promise.resolve(request);undoWrites.current.add(promise);
    try{return await promise;}finally{undoWrites.current.delete(promise);}
  };
  const queueWrite = <T,>(request:()=>PromiseLike<T>) => {
    const next=writeQueue.current.then(request);writeQueue.current=next.catch(()=>undefined);
    return trackUndoWrite(next);
  };
  const prepareUndo = async () => {
    itemSaveTimers.current.forEach(clearTimeout);sectionSaveTimers.current.forEach(clearTimeout);
    itemSaveTimers.current.clear();sectionSaveTimers.current.clear();pendingItems.current.clear();pendingSections.current.clear();
    await Promise.allSettled([...undoWrites.current]);
    lastSaveRef.current=Date.now();
  };
  const pendingItems = useRef(new Map<string, Partial<DJMCItem>>());
  const pendingSections = useRef(new Map<string, Partial<DJMCSection>>());

  // Per-item debounce timers
  const itemSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Per-section debounce timers
  const sectionSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Helper: update questionnaire state and cache simultaneously
  const setCachedQuestionnaire = useCallback((updater: React.SetStateAction<DJMCQuestionnaire | null>) => {
    setQuestionnaire(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next && eventId) questionnaireCache.set(eventId, next);
      return next;
    });
  }, [eventId]);

  // Fetch or create questionnaire for event
  const fetchQuestionnaire = useCallback(async (invalidate: unknown = false) => {
    if (!eventId) {
      setCachedQuestionnaire(null);
      return;
    }

    const generation = getCacheGeneration();
    return read.current(`${generation}:${eventId}`, async () => {
    if (currentEvent.current !== eventId || getCacheGeneration() !== generation) return;
    // Only show loading spinner if we don't have cached data
    const hasCachedData = questionnaireCache.has(eventId);
    if (!hasCachedData) {
      setLoading(true);
    }
    try {
      // First, try to get existing questionnaire
      const { data: existingQ, error: fetchError } = await supabase
        .from('dj_mc_questionnaires')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (currentEvent.current !== eventId || getCacheGeneration() !== generation) return;

      let questionnaireId: string;

      if (existingQ) {
        questionnaireId = existingQ.id;
      } else {
        // Create new questionnaire
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        if (currentEvent.current !== eventId || getCacheGeneration() !== generation) return;

        const { data: newQ, error: createError } = await supabase
          .from('dj_mc_questionnaires')
          .insert({ event_id: eventId, user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        questionnaireId = newQ.id;

        // Create default sections and items
        await createDefaultSections(questionnaireId);
      }

      // Fetch full questionnaire with sections and items
      const fullQuestionnaire = await fetchFullQuestionnaire(questionnaireId);
      if (currentEvent.current !== eventId || getCacheGeneration() !== generation) return;
      setCachedQuestionnaire(fullQuestionnaire);

      // Fetch share tokens
      await fetchShareTokens(questionnaireId);
    } catch (error) {
      if (currentEvent.current !== eventId || getCacheGeneration() !== generation) return;
      console.error('Error fetching questionnaire:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questionnaire',
        variant: 'destructive',
      });
    } finally {
      if (currentEvent.current === eventId && getCacheGeneration() === generation) setLoading(false);
    }
    }, invalidate === true);
  }, [eventId, toast]);

  // Create default sections from templates
  const createDefaultSections = async (questionnaireId: string) => {
    for (let sectionIndex = 0; sectionIndex < DEFAULT_SECTION_TEMPLATES.length; sectionIndex++) {
      const template = DEFAULT_SECTION_TEMPLATES[sectionIndex];
      
      // Insert section
      const { data: section, error: sectionError } = await supabase
        .from('dj_mc_sections')
        .insert({
          questionnaire_id: questionnaireId,
          section_type: template.section_type,
          section_label: template.section_label,
          order_index: sectionIndex,
          is_collapsed: false,
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Insert items for this section
      const itemsToInsert = template.items.map((item, itemIndex) => ({
        section_id: section.id,
        row_label: item.row_label,
        value_text: null,
        music_url: null,
        pronunciation_audio_url: null,
        duration: null,
        order_index: itemIndex,
        is_default: true,
      }));

      const { error: itemsError } = await supabase
        .from('dj_mc_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  };

  // Fetch full questionnaire with all relations
  const fetchFullQuestionnaire = async (questionnaireId: string): Promise<DJMCQuestionnaire> => {
    const { data: q, error: qError } = await supabase
      .from('dj_mc_questionnaires')
      .select('*')
      .eq('id', questionnaireId)
      .single();

    if (qError) throw qError;

    const { data: sections, error: sectionsError } = await supabase
      .from('dj_mc_sections')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('order_index');

    if (sectionsError) throw sectionsError;

    // One RLS-protected read instead of one concurrent request per section.
    const sectionIds = sections.map(section => section.id);
    const { data: items, error: itemsError } = sectionIds.length
      ? await supabase.from('dj_mc_items').select('*').in('section_id', sectionIds).order('order_index')
      : { data: [], error: null };
    if (itemsError) throw itemsError;
    const itemsBySection = new Map<string, DJMCItem[]>();
    for (const item of items || []) {
      const group = itemsBySection.get(item.section_id) || [];
      group.push(item as DJMCItem);
      itemsBySection.set(item.section_id, group);
    }
    const sectionsWithItems: DJMCSection[] = sections.map(section => ({
      ...section,
      section_type: section.section_type as SectionType,
      items: itemsBySection.get(section.id) || [],
    } as DJMCSection));

    return {
      ...q,
      sections: sectionsWithItems,
    } as DJMCQuestionnaire;
  };

  // Fetch share tokens
  const fetchShareTokens = async (questionnaireId: string) => {
    const generation = getCacheGeneration();
    const { data, error } = await supabase
      .from('dj_mc_share_tokens')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('created_at', { ascending: false });

    if (!error && data && currentEvent.current === eventId && getCacheGeneration() === generation) {
      setShareTokens(data as DJMCShareToken[]);
      if (eventId) shareTokensCache.set(eventId, data as DJMCShareToken[]);
    }
  };

  // Per-section debounced save (300ms)
  const saveSectionToDb = useCallback((sectionId: string, updates: Partial<DJMCSection>) => {
    pendingSections.current.set(sectionId, { ...pendingSections.current.get(sectionId), ...updates });
    const existing = sectionSaveTimers.current.get(sectionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      sectionSaveTimers.current.delete(sectionId);
      const combinedUpdates = pendingSections.current.get(sectionId) || updates;
      pendingSections.current.delete(sectionId);
      lastSaveRef.current = Date.now();
      setSaving(true);
      try {
        const { error } = await queueWrite(()=>supabase
          .from('dj_mc_sections')
          .update(combinedUpdates)
          .eq('id', sectionId));
        if (error) throw error;
      } catch (error) {
        console.error('Error saving section:', error);
      } finally {
        lastSaveRef.current=Date.now();
        setSaving(false);
      }
    }, 300);

    sectionSaveTimers.current.set(sectionId, timer);
  }, []);

  // Update section
  const updateSection = useCallback(async (sectionId: string, updates: Partial<DJMCSection>) => {
    // Optimistic update
    setCachedQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
    });

    saveSectionToDb(sectionId, updates);
  }, [saveSectionToDb]);

  // Per-item debounced save (300ms)
  const saveItemToDb = useCallback((itemId: string, updates: Partial<DJMCItem>) => {
    pendingItems.current.set(itemId, { ...pendingItems.current.get(itemId), ...updates });
    const existing = itemSaveTimers.current.get(itemId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      itemSaveTimers.current.delete(itemId);
      const combinedUpdates = pendingItems.current.get(itemId) || updates;
      pendingItems.current.delete(itemId);
      lastSaveRef.current = Date.now();
      setSaving(true);
      try {
        const { error } = await queueWrite(()=>supabase
          .from('dj_mc_items')
          .update(combinedUpdates)
          .eq('id', itemId));
        if (error) throw error;
      } catch (error) {
        console.error('Error updating item:', error);
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive',
        });
      } finally {
        lastSaveRef.current=Date.now();
        setSaving(false);
      }
    }, 300);

    itemSaveTimers.current.set(itemId, timer);
  }, [toast]);

  // Update item
  const updateItem = useCallback(async (itemId: string, updates: Partial<DJMCItem>) => {
    // Optimistic update
    setCachedQuestionnaire(prev => {
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

    saveItemToDb(itemId, updates);
  }, [saveItemToDb]);

  // Text-only Undo is synchronous on screen and uses the same debounced, serialised autosave.
  const restoreLocalTextUndo = (sections:DJMCSection[]) => {
    const current=questionnaireRef.current;
    if(!current||current.event_id!==eventId)return false;
    const updates=textUndoUpdates(current.sections,sections);if(!updates)return false;
    const next={...current,sections:structuredClone(sections)};questionnaireRef.current=next;
    lastSaveRef.current=Date.now();setCachedQuestionnaire(next);
    updates.items.forEach(({id,changes})=>saveItemToDb(id,changes));
    updates.sections.forEach(({id,changes})=>saveSectionToDb(id,changes));
    return true;
  };
  // Add new item to section
  const addItem = useCallback(async (sectionId: string, rowLabel: string = 'New Item') => {
    if (!questionnaire) return;

    const section = questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newOrderIndex = Math.max(-1, ...section.items.map(item => item.order_index)) + 1;

    try {
      const { data: newItem, error } = await supabase
        .from('dj_mc_items')
        .insert({
          section_id: sectionId,
          row_label: rowLabel,
          order_index: newOrderIndex,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCachedQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId
              ? { ...s, items: [...s.items, newItem as DJMCItem] }
              : s
          ),
        };
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add row',
        variant: 'destructive',
      });
    }
  }, [questionnaire, toast]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('dj_mc_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setCachedQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s => ({
            ...s,
            items: s.items.filter(i => i.id !== itemId),
          })),
        };
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete row',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Duplicate item
  const duplicateItem = useCallback(async (item: DJMCItem) => {
    try {
      const { data: newItem, error } = await supabase
        .from('dj_mc_items')
        .insert({
          section_id: item.section_id,
          row_label: item.row_label,
          ...(item.custom_values ? {custom_values:item.custom_values} : {}),
          value_text: item.value_text,
          song_title_artist: item.song_title_artist,
          music_url: item.music_url,
          // A duplicate must never share a private storage object with its source.
          pronunciation_audio_url: null,
          duration: item.duration,
          order_index: item.order_index + 1,
          is_default: false,
          is_bold: item.is_bold || false,
          is_italic: item.is_italic || false,
          is_underline: item.is_underline || false,
          is_section_header: item.is_section_header || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCachedQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === item.section_id
              ? {
                  ...s,
                  items: [...s.items.slice(0, s.items.findIndex(i => i.id === item.id) + 1),
                    newItem as DJMCItem,
                    ...s.items.slice(s.items.findIndex(i => i.id === item.id) + 1)
                  ],
                }
              : s
          ),
        };
      });
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate row',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Reorder items within section
  const reorderItems = useCallback(async (sectionId: string, items: DJMCItem[]) => {
    // Optimistic update
    setCachedQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, items } : s
        ),
      };
    });

    // Update order in database
    try {
      const updates = items.map((item, index) => 
        supabase
          .from('dj_mc_items')
          .update({ order_index: index })
          .eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
    } catch (error) {
      console.error('Error reordering items:', error);
      toast({ title: 'Order not saved', description: 'Please retry moving the row.', variant: 'destructive' });
    }
  }, []);

  // Reset section to default template
  const resetSectionToDefault = useCallback(async (sectionId: string) => {
    if (!questionnaire) return;

    const section = questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return;

    const template = DEFAULT_SECTION_TEMPLATES.find(t => t.section_type === section.section_type);
    if (!template) return;

    try {
      // Delete existing items
      await supabase
        .from('dj_mc_items')
        .delete()
        .eq('section_id', sectionId);

      // Insert default items
      const itemsToInsert = template.items.map((item, index) => ({
        section_id: sectionId,
        row_label: item.row_label,
        order_index: index,
        is_default: true,
      }));

      const { data: newItems, error } = await supabase
        .from('dj_mc_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      // Reset section label and notes
      await supabase
        .from('dj_mc_sections')
        .update({ section_label: template.section_label, notes: null, ...(section.custom_columns ? {custom_columns:null} : {}) })
        .eq('id', sectionId);

      // Update local state
      setCachedQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId
              ? { ...s, section_label: template.section_label, notes: null, custom_columns:null, items: newItems as DJMCItem[] }
              : s
          ),
        };
      });

      toast({
        title: 'Reset Complete',
        description: 'Section has been reset to defaults',
      });
    } catch (error) {
      console.error('Error resetting section:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset section',
        variant: 'destructive',
      });
    }
  }, [questionnaire, toast]);

  // Duplicate entire section with items
  const duplicateSection = useCallback(async (sectionId: string) => {
    if (!questionnaire) return;

    const section = questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return;

    const sectionIndex = questionnaire.sections.findIndex(s => s.id === sectionId);
    const newOrderIndex = section.order_index + 1;

    try {
      // Update order_index for all subsequent sections
      const sectionsToUpdate = questionnaire.sections.filter(s => s.order_index > section.order_index);
      if (sectionsToUpdate.length > 0) {
        await Promise.all(
          sectionsToUpdate.map(s =>
            supabase.from('dj_mc_sections').update({ order_index: s.order_index + 1 }).eq('id', s.id)
          )
        );
      }

      // Create new section
      const { data: newSection, error: sectionError } = await supabase
        .from('dj_mc_sections')
        .insert({
          questionnaire_id: questionnaire.id,
          section_type: section.section_type,
          section_label: `${section.section_label} (Copy)`,
          order_index: newOrderIndex,
          notes: section.notes,
          ...(section.custom_columns ? {custom_columns:section.custom_columns} : {}),
          is_collapsed: false,
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Duplicate items
      let newItems: DJMCItem[] = [];
      if (section.items.length > 0) {
        const itemsToInsert = section.items.map((item, index) => ({
          section_id: newSection.id,
          row_label: item.row_label,
          ...(item.custom_values ? {custom_values:item.custom_values} : {}),
          value_text: item.value_text,
          song_title_artist: item.song_title_artist,
          is_bold: item.is_bold,
          is_italic: item.is_italic,
          is_underline: item.is_underline,
          is_section_header: item.is_section_header,
          music_url: item.music_url,
          // A duplicate must never share a private storage object with its source.
          pronunciation_audio_url: null,
          duration: item.duration,
          order_index: index,
          is_default: false,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('dj_mc_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;
        newItems = insertedItems as DJMCItem[];
      }

      // Update local state
      setCachedQuestionnaire(prev => {
        if (!prev) return prev;
        const newSectionWithItems: DJMCSection = {
          ...newSection,
          section_type: section.section_type,
          items: newItems,
        };
        const updatedSections = [...prev.sections];
        // Insert after the original section
        updatedSections.splice(sectionIndex + 1, 0, newSectionWithItems);
        // Update order_index for all sections
        return {
          ...prev,
          sections: updatedSections.map((s, idx) => ({ ...s, order_index: idx })),
        };
      });

    toast({
      title: 'Section Duplicated',
      description: 'You can rename the new section by clicking its title',
    });
  } catch (error) {
    console.error('Error duplicating section:', error);
    toast({
      title: 'Error',
      description: 'Failed to duplicate section',
      variant: 'destructive',
    });
  }
}, [questionnaire, toast]);

const deleteSection = useCallback(async (sectionId: string) => {
  if (!questionnaire) return;

  const section = questionnaire.sections.find(s => s.id === sectionId);
  if (!section) return;

  try {
    // The foreign key cascades item deletion only after the section delete succeeds.
    // Delete the section
    const { error } = await supabase.from('dj_mc_sections').delete().eq('id', sectionId);
    if (error) throw error;

    // Update order_index for subsequent sections
    const sectionsToUpdate = questionnaire.sections.filter(s => s.order_index > section.order_index);
    if (sectionsToUpdate.length > 0) {
      await Promise.all(
        sectionsToUpdate.map(s =>
          supabase.from('dj_mc_sections').update({ order_index: s.order_index - 1 }).eq('id', s.id)
        )
      );
    }

    // Update local state
    setCachedQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections
          .filter(s => s.id !== sectionId)
          .map((s, idx) => ({ ...s, order_index: idx })),
      };
    });

    toast({
      title: 'Section Deleted',
      description: 'The section and all its items have been removed',
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    toast({
      title: 'Error',
      description: 'Failed to delete section',
      variant: 'destructive',
    });
  }
}, [questionnaire, toast]);

  // Generate share token
  const generateShareToken = useCallback(async (
    permission: 'view_only' | 'can_edit',
    recipientName?: string,
    validityDays: number = 90
  ): Promise<string | null> => {
    if (!questionnaire) return null;

    try {
      const { data, error } = await supabase.rpc('generate_dj_mc_share_token', {
        _questionnaire_id: questionnaire.id,
        _permission: permission,
        _recipient_name: recipientName || null,
        _validity_days: validityDays,
      });

      if (error) throw error;

      // Refresh share tokens
      await fetchShareTokens(questionnaire.id);

      return data as string;
    } catch (error) {
      console.error('Error generating share token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link',
        variant: 'destructive',
      });
      return null;
    }
  }, [questionnaire, toast]);

  // Delete share token
  const deleteShareToken = useCallback(async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('dj_mc_share_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      setShareTokens(prev => { const next = prev.filter(t => t.id !== tokenId); if (eventId) shareTokensCache.set(eventId, next); return next; });

      toast({
        title: 'Access Revoked',
        description: 'Share link has been deleted',
      });
    } catch (error) {
      console.error('Error deleting share token:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke access',
        variant: 'destructive',
      });
    }
  }, [toast, eventId]);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    if (!questionnaire) return 0;

    let totalItems = 0;
    let filledItems = 0;

    questionnaire.sections.forEach(section => {
      section.items.forEach(item => {
        totalItems++;
        if (item.value_text || item.music_url) {
          filledItems++;
        }
      });
    });

    return totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0;
  }, [questionnaire]);

  // Initial fetch
  useEffect(() => {
    setQuestionnaire(eventId ? questionnaireCache.get(eventId) ?? null : null);
    setShareTokens(eventId ? shareTokensCache.get(eventId) ?? [] : []);
    fetchQuestionnaire();
  }, [fetchQuestionnaire]);

  // Realtime subscription for dj_mc_items changes (e.g. edits from shared links)
  // Uses self-save guard to prevent feedback loop when we edit locally
  const realtimeSectionIds = questionnaire?.sections.map(section => section.id).sort().join('|') || '';
  useEffect(() => {
    if (!questionnaire?.id) return;
    const sectionIds = realtimeSectionIds.split('|').filter(Boolean);
    if (sectionIds.length === 0) return;

    const channel = supabase
      .channel(`dashboard-djmc-items:${questionnaire.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dj_mc_items',
      }, (payload) => {
        // Ignore realtime events caused by our own recent saves
        if (undoWrites.current.size || pendingItems.current.size || pendingSections.current.size || Date.now() - lastSaveRef.current < SELF_SAVE_COOLDOWN_MS) {
          return;
        }
        const changedSectionId = (payload.new as any)?.section_id || (payload.old as any)?.section_id;
        if (changedSectionId && sectionIds.includes(changedSectionId)) {
          fetchQuestionnaire(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [questionnaire?.id, realtimeSectionIds, fetchQuestionnaire]);

  const refreshShareTokens = useCallback(async () => {
    if (!questionnaire) return;
    await fetchShareTokens(questionnaire.id);
  }, [questionnaire]);

  return {
    questionnaire,
    prepareUndo,
    restoreLocalTextUndo,
    loading,
    saving,
    shareTokens,
    updateSection,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetSectionToDefault,
    duplicateSection,
    deleteSection,
    generateShareToken,
    deleteShareToken,
    refreshShareTokens,
    calculateProgress,
    refetch: fetchQuestionnaire,
  };
}
