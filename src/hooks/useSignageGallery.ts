import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SignageGalleryImage {
  id: string;
  name: string;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
}

export const useSignageGallery = () => {
  const [images, setImages] = useState<SignageGalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('signage_gallery_images' as any)
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const galleryImages = (data || []) as unknown as SignageGalleryImage[];
      setImages(galleryImages);

      const uniqueCategories = [...new Set(galleryImages.map(img => img.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching signage gallery images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  return {
    images,
    categories,
    loading,
    error,
    refetch: fetchGalleryImages,
  };
};
