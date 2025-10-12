import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GalleryExport {
  id: string;
  gallery_id: string;
  scope: 'approved' | 'all';
  status: 'queued' | 'running' | 'ready' | 'error';
  file_path: string | null;
  download_url: string | null;
  file_size_bytes: number | null;
  items_count: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

export const useGalleryExports = (galleryId: string | null) => {
  const [exports, setExports] = useState<GalleryExport[]>([]);
  const [activeExport, setActiveExport] = useState<GalleryExport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchExports = async () => {
    if (!galleryId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_exports' as any)
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      const exportsList = (data || []) as any as GalleryExport[];
      setExports(exportsList);
      
      const active = exportsList.find(e => e.status === 'running' || e.status === 'queued');
      setActiveExport(active || null);
      
    } catch (error: any) {
      console.error('Error fetching exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const startExport = async (scope: 'approved' | 'all') => {
    if (!galleryId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('export-gallery-zip', {
        body: { galleryId, scope },
      });

      if (error) throw error;

      if (data.code === 'RATE_LIMIT') {
        toast({
          title: 'Please wait',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Export Started',
        description: 'We\'re building your ZIP. You can keep using the app.',
      });

      setTimeout(() => fetchExports(), 2000);
      
    } catch (error: any) {
      console.error('Error starting export:', error);
      toast({
        title: 'Error',
        description: 'Couldn\'t start export. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!activeExport) return;

    const interval = setInterval(() => {
      fetchExports();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeExport?.id]);

  useEffect(() => {
    fetchExports();
  }, [galleryId]);

  return { 
    exports, 
    activeExport, 
    loading, 
    startExport, 
    refetch: fetchExports 
  };
};
