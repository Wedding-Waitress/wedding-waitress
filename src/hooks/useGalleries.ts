import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Gallery {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  event_id: string | null;
  event_type: string | null;
  event_date: string | null;
  is_active: boolean;
  require_approval: boolean;
  created_at: string;
  updated_at: string;
}

export const useGalleries = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGalleries = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('owner_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleries((data || []) as Gallery[]);
    } catch (error: any) {
      console.error('Error fetching galleries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load galleries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  return { galleries, loading, refetch: fetchGalleries };
};
