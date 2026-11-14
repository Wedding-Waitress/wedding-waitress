import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCacheGeneration, getCacheUserId } from '@/lib/cacheRegistry';
export interface SignageGalleryImage {
  id: string; name: string; category: string; image_url: string;
  preview_url: string | null; thumbnail_url: string | null;
  sort_order: number; created_at: string; categories: string[];
}
export interface CategoryWithCount { name: string; count: number }
export const useSignageGallery = () => {
  const client = useQueryClient();
  const queryKey = ['signage-gallery', getCacheUserId(), getCacheGeneration()];
  const query = useQuery({
    queryKey, staleTime: 5 * 60_000, gcTime: 15 * 60_000, refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('signage_gallery_images' as any)
        .select('*, signage_image_categories(signage_categories(name))').order('sort_order', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown as Array<Record<string, any>>).map((row): SignageGalleryImage => {
        const joins = Array.isArray(row.signage_image_categories) ? row.signage_image_categories : [];
        const names = joins.map((join: any) => join?.signage_categories?.name).filter((name: unknown): name is string => typeof name === 'string' && name.length > 0);
        return {
          id: row.id, name: row.name, category: row.category, image_url: row.image_url,
          preview_url: row.preview_url ?? null, thumbnail_url: row.thumbnail_url ?? null,
          sort_order: row.sort_order ?? 0, created_at: row.created_at,
          categories: names.length ? Array.from(new Set(names)) : typeof row.category === 'string' && row.category.length > 0 ? [row.category] : [],
        };
      });
    },
  });
  const images = query.data ?? [];
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    images.forEach(image => image.categories.forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1)));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data]);
  return {
    images, categoriesWithCounts, categories: categoriesWithCounts.map(category => category.name),
    loading: query.isPending, error: query.error ? query.error.message || 'Failed to load gallery' : null,
    removeImageFromGallery: (id: string) => {
      void client.cancelQueries({ queryKey });
      client.setQueryData<SignageGalleryImage[]>(queryKey, current => current?.filter(image => image.id !== id));
    },
    refetch: query.refetch,
  };
};
