import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RunningSheet, RunningSheetItem, RunningSheetWithUpdater } from '@/types/runningSheet';
import debounce from 'lodash-es/debounce';

export const useRunningSheet = (eventId: string | null) => {
  const [sheet, setSheet] = useState<RunningSheetWithUpdater | null>(null);
  const [items, setItems] = useState<RunningSheetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch or create sheet for event
  const fetchSheet = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      // Try to fetch existing sheet
      const { data: existingSheet, error: fetchError } = await supabase
        .from('running_sheets')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSheet) {
        // Fetch updater name
        if (existingSheet.updated_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', existingSheet.updated_by)
            .single();

          setSheet({
            ...existingSheet,
            updated_by_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          });
        } else {
          setSheet(existingSheet);
        }

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from('running_sheet_items')
          .select('*')
          .eq('sheet_id', existingSheet.id)
          .order('order_index');

        if (itemsError) throw itemsError;
        setItems(itemsData || []);
      } else {
        // Create new sheet with 10 blank rows
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: newSheet, error: createError } = await supabase
          .from('running_sheets')
          .insert({
            event_id: eventId,
            user_id: user.id,
            show_responsible: true,
            updated_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create 10 blank rows
        const blankItems = Array.from({ length: 10 }, (_, i) => ({
          sheet_id: newSheet.id,
          order_index: (i + 1) * 10,
          time_text: '',
          description_rich: {},
          responsible: '',
          is_section_header: false,
        }));

        const { data: newItems, error: itemsError } = await supabase
          .from('running_sheet_items')
          .insert(blankItems)
          .select();

        if (itemsError) throw itemsError;

        // Get updater name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        setSheet({
          ...newSheet,
          updated_by_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
        });
        setItems(newItems || []);
      }
    } catch (error) {
      console.error('Error fetching/creating sheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to load running sheet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [eventId]);

  // Create new item
  const createItem = async (itemData: Partial<RunningSheetItem>) => {
    if (!sheet) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const maxOrderIndex = items.length > 0 
        ? Math.max(...items.map(i => i.order_index))
        : 0;

      const { data: newItem, error } = await supabase
        .from('running_sheet_items')
        .insert({
          sheet_id: sheet.id,
          order_index: maxOrderIndex + 10,
          time_text: itemData.time_text || '',
          description_rich: itemData.description_rich || {},
          responsible: itemData.responsible || '',
          is_section_header: itemData.is_section_header || false,
        })
        .select()
        .single();

      if (error) throw error;

      setItems(prevItems => [...prevItems, newItem]);

      // Update sheet metadata
      await updateSheetMetadata(user.id);

      toast({
        title: '✓ Saved',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create item',
        variant: 'destructive',
      });
    }
  };

  // Update item - Silent auto-save (no toast)
  const updateItem = async (id: string, data: Partial<RunningSheetItem>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('running_sheet_items')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, ...data } : item));

      // Update sheet metadata
      await updateSheetMetadata(user.id);

      // NO TOAST - Silent auto-save for better UX
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Save Failed',
        description: 'Changes could not be saved. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('running_sheet_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prevItems => prevItems.filter(item => item.id !== id));

      // Update sheet metadata
      await updateSheetMetadata(user.id);

      toast({
        title: '✓ Deleted',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  // Reorder items
  const reorderItems = async (newOrder: RunningSheetItem[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update order_index for all items
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        order_index: (index + 1) * 10,
      }));

      for (const update of updates) {
        await supabase
          .from('running_sheet_items')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      setItems(newOrder);

      // Update sheet metadata
      await updateSheetMetadata(user.id);

      toast({
        title: '✓ Reordered',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error reordering items:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder items',
        variant: 'destructive',
      });
    }
  };

  // Update sheet metadata
  const updateSheetMetadata = async (userId: string) => {
    if (!sheet) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    await supabase
      .from('running_sheets')
      .update({
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sheet.id);

    setSheet({
      ...sheet,
      updated_by: userId,
      updated_at: new Date().toISOString(),
      updated_by_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
    });
  };

  // Update sheet settings
  const updateSheet = async (data: Partial<RunningSheet>) => {
    if (!sheet) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('running_sheets')
        .update({
          ...data,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheet.id);

      if (error) throw error;

      // Fetch updated profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      setSheet({
        ...sheet,
        ...data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
      });

      toast({
        title: '✓ Updated',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error updating sheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((id: string, data: Partial<RunningSheetItem>) => {
        updateItem(id, data);
      }, 600),
    []
  );

  return {
    sheet,
    items,
    loading,
    createItem,
    updateItem,
    deleteItem,
    reorderItems,
    updateSheet,
    debouncedSave,
    refetch: fetchSheet,
  };
};
