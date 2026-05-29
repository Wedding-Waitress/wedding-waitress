// Public password gate for the guest upload page and Live View.
// Stores a per-token "verified" flag in sessionStorage so guests aren't
// re-prompted on every navigation/refresh during the same session.
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { resolveGalleryTheme, type GalleryTheme } from '@/lib/galleryTheme';

interface Props {
  token: string;
  title?: string;
  /** Called with the raw password once verified, plus the cache key */
  onVerified: (password: string) => void;
  variant?: 'light' | 'dark';
  theme?: GalleryTheme | null;
}

export const galleryPasswordKey = (token: string) => `gallery-pw:${token}`;

export const GalleryPasswordGate: React.FC<Props> = ({ token, title, onVerified, variant = 'light', theme }) => {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await (supabase as any).rpc('verify_event_media_password', {
        _token: token,
        _password: pw,
      });
      if (error) throw new Error(error.message);
      if (data === true) {
        try { sessionStorage.setItem(galleryPasswordKey(token), pw); } catch {}
        onVerified(pw);
      } else {
        setErr('Incorrect password. Please try again.');
      }
    } catch (e: any) {
      setErr(e?.message || 'Could not verify password');
    } finally {
      setLoading(false);
    }
  };

  // If a full theme is provided, it overrides the legacy variant prop.
  const t: GalleryTheme = theme || resolveGalleryTheme(
    variant === 'dark'
      ? { background_style: 'dark' }
      : { background_style: 'cream' }
  );
  const isDark = t.isDark;
  const accent = t.themeColor;
  const accentHover = t.themeColorHover;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.bgClass} ${t.textClass}`}>
      <Card className={`p-8 max-w-md w-full ${t.surfaceClass}`}>
        {t.showBranding === false ? null : t.logoImageUrl ? (
          <img src={t.logoImageUrl} alt="" className="mx-auto max-h-12 mb-3 object-contain" />
        ) : null}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ backgroundColor: `${accent}1A` }}
          >
            <Lock className="h-7 w-7" style={{ color: accent }} />
          </div>
          <h1 className="text-xl font-semibold">{title || 'Password required'}</h1>
          <p className={`text-sm mt-1 ${t.mutedClass}`}>
            Please enter the password the hosts shared with you.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="gallery-pw" className="text-base">Password</Label>
            <Input
              id="gallery-pw"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={`h-12 text-base mt-2 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40' : ''}`}
              placeholder="Enter password"
            />
          </div>
          {err && (
            <div className="text-sm text-red-500 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> {err}
            </div>
          )}
          <Button
            type="submit"
            className="lv-premium-shade w-full h-12 text-white"
            style={{ backgroundColor: accent }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent; }}
            disabled={loading || !pw.trim()}
          >
            {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Verifying…</> : 'Unlock gallery'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default GalleryPasswordGate;
