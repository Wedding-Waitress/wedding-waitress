import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GalleryImage {
  id: string;
  name: string;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
  categories: string[];
}

export interface CategoryWithCount {
  name: string;
  count: number;
}

export const usePlaceCardGallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recompute = (galleryImages: GalleryImage[]) => {
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
        .from('place_card_gallery_images')
        .select('*, place_card_image_categories(place_card_categories(name))' as any)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data || []) as unknown as Array<Record<string, any>>;
      const galleryImages: GalleryImage[] = rows.map((row) => {
        const joinRows = Array.isArray(row.place_card_image_categories) ? row.place_card_image_categories : [];
        const cats = joinRows
          .map((j: any) => j?.place_card_categories?.name)
          .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);
        const merged = cats.length > 0
          ? Array.from(new Set(cats))
          : (typeof row.category === 'string' && row.category.length > 0 ? [row.category] : []);
        return {
          id: row.id,
          name: row.name,
          category: row.category,
          image_url: row.image_url,
          thumbnail_url: row.thumbnail_url ?? null,
          sort_order: row.sort_order ?? 0,
          created_at: row.created_at,
          categories: merged,
        };
      });

      setImages(galleryImages);
      recompute(galleryImages);
    } catch (err) {
      console.error('Error fetching gallery images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const getImagesByCategory = (category: string): GalleryImage[] => {
    return images.filter((img) => img.categories.includes(category));
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
    refetch: fetchGalleryImages,
    getImagesByCategory,
    removeImageFromGallery,
  };
};
