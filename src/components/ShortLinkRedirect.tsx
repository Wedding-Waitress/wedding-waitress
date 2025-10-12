import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ShortLinkRedirect component
 * Handles /e/:slug routes and redirects to full event gallery URLs
 * Also tracks click analytics for QR code scans
 */
export const ShortLinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShortlink = async () => {
      if (!slug) {
        setTargetUrl('/404');
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('event_shortlinks')
          .select('target_url, click_count, event_id')
          .eq('slug', slug)
          .maybeSingle();

        if (error || !data) {
          console.error('Shortlink not found:', error);
          setTargetUrl('/404');
        } else {
          // Track click (fire and forget - don't block redirect)
          supabase
            .from('event_shortlinks')
            .update({ 
              click_count: (data.click_count || 0) + 1,
              last_clicked_at: new Date().toISOString()
            })
            .eq('slug', slug)
            .then(() => {}); // Silent fail for analytics
          
          setTargetUrl(data.target_url);
        }
      } catch (error) {
        console.error('Error fetching shortlink:', error);
        setTargetUrl('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchShortlink();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (targetUrl) {
    return <Navigate to={targetUrl} replace />;
  }

  return <Navigate to="/404" replace />;
};
