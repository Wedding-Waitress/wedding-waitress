import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const QRRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }

    // Navigate directly to the edge function — the browser follows the 302 natively
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'xytxkidpourwdbzzwcdp';
    window.location.href = `https://${projectId}.supabase.co/functions/v1/qr-redirect?code=${encodeURIComponent(code)}`;
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md bg-card rounded-2xl shadow-soft border border-border">
          <h1 className="text-2xl font-bold text-primary mb-2">💍 Wedding Waitress</h1>
          <p className="text-muted-foreground">
            This QR code link is invalid. Please check with your event host.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to your event...</p>
      </div>
    </div>
  );
};
