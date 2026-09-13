import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import controls from './AccountControls.module.css';

// No record means no consent. Visiting this form never writes a preference.
export function MarketingPreferences() {
  const [choice, setChoice] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'unavailable'>('loading');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Authentication required');
        const { data, error } = await supabase.from('marketing_preferences' as never)
          .select('status,consent_email').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (!current) return;
        const preference = data as { status: string; consent_email: string } | null;
        setChoice(preference?.status === 'opted_in' && preference.consent_email === user.email?.toLowerCase());
        setState('ready');
      } catch { if (current) setState('unavailable'); }
    })();
    return () => { current = false; };
  }, []);
  const save = async () => {
    setState('saving'); setNotice('');
    try {
      const { error } = await supabase.rpc('set_my_marketing_preference' as never, { p_opted_in: choice } as never);
      if (error) throw error;
      setNotice(choice ? 'Marketing email preference saved: opted in.' : 'Marketing email preference saved: opted out.');
      setState('ready');
    } catch { setNotice('Unable to save your preference. Please try again.'); setState('ready'); }
  };
  return <section className="mt-6 border-t border-border/50 pt-4" aria-labelledby="marketing-email-heading">
    <h3 id="marketing-email-heading" className="text-sm font-semibold">Marketing email preferences</h3>
    <p className="text-sm mt-1">Optional news and offers. This does not change sign-in, account or event notifications.</p>
    {state === 'unavailable' ? <p role="status" className="text-sm mt-2">Marketing preferences are temporarily unavailable. No opt-in has been recorded.</p> : <>
      <label className="flex items-start gap-2 text-sm mt-3"><input type="checkbox" checked={choice}
        disabled={state !== 'ready'} onChange={e => { setChoice(e.target.checked); setNotice(''); }} />
        I agree to receive Wedding Waitress news and promotional offers by email. I can unsubscribe at any time.</label>
      <Button type="button" size="sm" className={`${controls.secondaryButton} mt-3`} disabled={state !== 'ready'} onClick={save}>
        {state === 'saving' ? 'Saving…' : state === 'loading' ? 'Loading…' : 'Save email preference'}</Button>
    </>}
    {notice && <p className="text-sm mt-2" role="status">{notice}</p>}
  </section>;
}
