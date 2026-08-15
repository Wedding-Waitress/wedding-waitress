import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PhotoBoothBackgroundTemplate } from '@/lib/photoBoothBackgroundTemplates';
import { naturalPhotoBoothTemplateCompare, PHOTO_BOOTH_TEMPLATE_BUCKET } from '@/lib/photoBoothTemplateAdmin';

type Row = {
  id: string; name: string; category: string; colour: string; image_url: string;
  thumbnail_url: string; original_path: string; thumbnail_path: string; created_at: string;
};

const toTemplate = (row: Row): PhotoBoothBackgroundTemplate => ({
  id: row.id, name: row.name, category: row.category, colour: row.colour,
  url: row.image_url, thumbUrl: row.thumbnail_url, sourceFilename: row.original_path,
});

export const usePhotoBoothTemplateLibrary = () => {
  const [templates, setTemplates] = useState<PhotoBoothBackgroundTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: fetchError } = await (supabase as any).from('photo_booth_background_templates').select('*').order('sort_order').order('name');
    if (fetchError) setError(fetchError.message || 'Could not load background templates.');
    else setTemplates(((data || []) as Row[]).map(toTemplate).sort(naturalPhotoBoothTemplateCompare));
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const remove = async (template: PhotoBoothBackgroundTemplate) => {
    const { data, error: readError } = await (supabase as any).from('photo_booth_background_templates').select('original_path,thumbnail_path').eq('id', template.id).single();
    if (readError) throw readError;
    const { error: deleteError } = await (supabase as any).from('photo_booth_background_templates').delete().eq('id', template.id);
    if (deleteError) throw deleteError;
    setTemplates((current) => current.filter((item) => item.id !== template.id));
    const paths = [data?.original_path, data?.thumbnail_path].filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(PHOTO_BOOTH_TEMPLATE_BUCKET).remove(paths);
      if (storageError) throw storageError;
    }
  };

  const update = async (id: string, category: string, colour: string) => {
    const { error: updateError } = await (supabase as any).from('photo_booth_background_templates').update({ category, colour, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) throw updateError;
    setTemplates((current) => current.map((item) => item.id === id ? { ...item, category, colour } : item));
  };

  return { templates, loading, error, refetch, remove, update };
};
