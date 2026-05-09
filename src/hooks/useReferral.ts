import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_BASE = 'https://www.weddingwaitress.com.au/signup';
export const REF_STORAGE_KEY = 'ww_ref_code';

export interface ReferralStats {
  total: number;
  signed_up: number;
  pending: number;
  credits_earned: number;
}

export const useReferral = (open: boolean) => {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({ total: 0, signed_up: 0, pending: 0, credits_earned: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [codeRes, statsRes] = await Promise.all([
        supabase.rpc('get_or_create_my_referral_code' as any),
        supabase.rpc('get_my_referral_stats' as any),
      ]);
      if (!codeRes.error && codeRes.data) setCode(codeRes.data as string);
      if (!statsRes.error && Array.isArray(statsRes.data) && statsRes.data[0]) {
        const r = statsRes.data[0] as any;
        setStats({
          total: Number(r.total) || 0,
          signed_up: Number(r.signed_up) || 0,
          pending: Number(r.pending) || 0,
          credits_earned: Number(r.credits_earned) || 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const link = code ? `${REFERRAL_BASE}?ref=${encodeURIComponent(code)}` : '';

  return { code, link, stats, loading, refresh };
};

/** Capture ?ref= from URL into sessionStorage so signup can attribute later. */
export const captureReferralFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !sessionStorage.getItem(REF_STORAGE_KEY)) {
      sessionStorage.setItem(REF_STORAGE_KEY, ref.trim().toUpperCase());
    }
  } catch {}
};

/** Call after the user is authenticated (e.g. on dashboard mount) to attribute. */
export const consumePendingReferral = async () => {
  try {
    const ref = sessionStorage.getItem(REF_STORAGE_KEY);
    if (!ref) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('record_referral_signup' as any, { p_code: ref });
    sessionStorage.removeItem(REF_STORAGE_KEY);
  } catch {}
};
