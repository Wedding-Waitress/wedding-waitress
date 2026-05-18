import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SignageGalleryImage {
  id: string;
  name: string;
  category: string;
  image_url: string;
  preview_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
  categories: string[];
}

export interface CategoryWithCount {
  name: string;
  count: number;
}

export const useSignageGallery = () => {
  const [images, setImages] = useState<SignageGalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recompute = (galleryImages: SignageGalleryImage[]) => {
    const counts = new Map<string, number>();
    galleryImages.forEach((img) => {
      img.categories.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    });
    const sorted = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCategoriesWithCounts(sorted);
    setCategories(sorted.map((c) => c.name));
  };

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('signage_gallery_images' as any)
        .select('*, signage_image_categories(signage_categories(name))')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data || []) as unknown as Array<Record<string, any>>;
      const galleryImages: SignageGalleryImage[] = rows.map((row) => {
        const joinRows = Array.isArray(row.signage_image_categories) ? row.signage_image_categories : [];
        const cats = joinRows
          .map((j: any) => j?.signage_categories?.name)
          .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);
        // Join table is the single source of truth. Only fall back to legacy text column when no join row exists.
        const merged = cats.length > 0
          ? Array.from(new Set(cats))
          : (typeof row.category === 'string' && row.category.length > 0 ? [row.category] : []);
        return {
          id: row.id,
          name: row.name,
          category: row.category,
          image_url: row.image_url,
          preview_url: row.preview_url ?? null,
          thumbnail_url: row.thumbnail_url ?? null,
          sort_order: row.sort_order ?? 0,
          created_at: row.created_at,
          categories: merged,
        };
      });

      setImages(galleryImages);
      recompute(galleryImages);
    } catch (err) {
      console.error('Error fetching signage gallery images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const removeImageFromGallery = (imageId: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== imageId);
      recompute(next);
      return next;
    });
  };

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  return {
    images,
    categories,
    categoriesWithCounts,
    loading,
    error,
    removeImageFromGallery,
    refetch: fetchGalleryImages,
  };
};
