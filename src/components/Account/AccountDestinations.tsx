import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';
import controlStyles from './AccountControls.module.css';
import styles from './AccountDestinations.module.css';

const CATEGORIES = ['Report a Bug', 'Request a Feature', 'Billing Question', 'Urgent Wedding Day Support', 'General Help', 'Technical Problem', 'Account Access Issue', 'SMS/Email Delivery Issue'] as const;
const helpSchema = z.object({ category: z.enum(CATEGORIES), fullName: z.string().trim().min(1, 'Name is required').max(100), email: z.string().trim().email('Valid email required').max(255), message: z.string().trim().min(1, 'Please describe your issue').max(2000) });

export const HelpSupportSection = () => {
  const { profile } = useProfile();
  const { plan, hasPlatformOwnerAccess } = useUserPlan();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  const [fullName, setFullName] = useState(() => [profile?.first_name, profile?.last_name].filter(Boolean).join(' '));
  const [email, setEmail] = useState(profile?.email ?? '');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const planName = useMemo(
    () => hasPlatformOwnerAccess
      ? 'Platform Owner Access'
      : !plan?.plan_name || /^(free|starter)$/i.test(plan.plan_name)
        ? 'Free'
        : plan.plan_name,
    [hasPlatformOwnerAccess, plan?.plan_name],
  );
  useEffect(() => {
    const composed = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(' ');
    if (composed) setFullName((value) => value || composed);
    if (profile?.email) setEmail((value) => value || profile.email || '');
    else void supabase.auth.getUser().then(({ data }) => setEmail((value) => value || data.user?.email || ''));
  }, [profile?.email, profile?.first_name, profile?.last_name]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) { setErrors({ category: 'Please choose a category' }); return; }
    const result = helpSchema.safeParse({ category, fullName, email, message });
    if (!result.success) { const next: Record<string, string> = {}; result.error.issues.forEach((issue) => { const key = String(issue.path[0]); if (!next[key]) next[key] = issue.message; }); setErrors(next); return; }
    setErrors({}); setSubmitting(true);
    try {
      const { data } = await supabase.auth.getUser();
      const { data: receipt, error } = await supabase.functions.invoke('send-transactional-email', { body: {
        templateName: 'contact-form-message', recipientEmail: 'support@weddingwaitress.com.au', idempotencyKey: `support-${crypto.randomUUID()}`,
        supportContext: { source: 'account_support', category: result.data.category, eventId: profile?.display_countdown_event_id || null },
        templateData: { name: result.data.fullName, email: result.data.email, eventType: `Support Request — ${result.data.category}`, message: result.data.message, date: new Date().toISOString() },
      } });
      if (error || receipt?.success === false) throw error || new Error('Request not accepted');
      toast.success(receipt?.recorded && !receipt?.accepted ? "Your support request has been recorded. We'll reply within 24 hours." : "Your support request has been sent. We'll reply within 24 hours."); setCategory(null); setMessage('');
    } catch { toast.error('Something went wrong. Please try again or email support@weddingwaitress.com.au'); }
    finally { setSubmitting(false); }
  };
  return <section className={styles.destination} data-account-section><form className={styles.helpForm} onSubmit={submit} noValidate>
    <div><h2>What do you need help with?</h2><div className={styles.categoryGrid}>{CATEGORIES.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>{errors.category && <p className={styles.error}>{errors.category}</p>}</div>
    <label>Full Name<input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />{errors.fullName && <span className={styles.error}>{errors.fullName}</span>}</label>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />{errors.email && <span className={styles.error}>{errors.email}</span>}</label>
    <label>How can we help?<textarea rows={6} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} disabled={submitting} />{errors.message && <span className={styles.error}>{errors.message}</span>}</label>
    <Button type="submit" disabled={submitting} className={controlStyles.primaryButton}>{submitting ? 'Sending…' : <><Send /> Send Message</>}</Button>
    <p className={styles.supportNote}>We typically reply within 24 hours. You can also email support@weddingwaitress.com.au.</p>
  </form></section>;
};
