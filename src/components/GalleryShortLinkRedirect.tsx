import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const GalleryShortLinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!slug) {
        navigate('/404');
        return;
      }

      try {
        // Fetch the target path for this short link
        const { data, error } = await supabase
          .from('gallery_shortlinks' as any)
          .select('target_path, gallery_id, click_count')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          console.error('Short link not found:', error);
          navigate('/404');
          return;
        }

        const shortlinkData = data as any;

        // Fire-and-forget: track click analytics
        supabase
          .from('gallery_shortlinks' as any)
          .update({
            click_count: (shortlinkData.click_count || 0) + 1,
            last_clicked_at: new Date().toISOString(),
          })
          .eq('slug', slug)
          .then(() => {});

        // Redirect to the target path
        navigate(shortlinkData.target_path, { replace: true });
      } catch (err) {
        console.error('Error handling redirect:', err);
        navigate('/404');
      }
    };

    handleRedirect();
  }, [slug, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};
