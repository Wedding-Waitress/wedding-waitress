import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PricingSection, type PlanKey } from '@/components/Pricing/PricingSection';
import { Button } from '@/components/ui/button';
import { RsvpOverageModal } from '@/components/Dashboard/RsvpOverageModal';
import { useProfile } from '@/hooks/useProfile';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';
import { getPlanByName, PLAN_REGISTRY } from '@/lib/planRegistry';
import controlStyles from './AccountControls.module.css';
import styles from './AccountDestinations.module.css';

const CATEGORIES = ['Report a Bug', 'Request a Feature', 'Billing Question', 'Urgent Wedding Day Support', 'General Help', 'Technical Problem', 'Account Access Issue', 'SMS/Email Delivery Issue'] as const;
const helpSchema = z.object({ category: z.enum(CATEGORIES), fullName: z.string().trim().min(1, 'Name is required').max(100), email: z.string().trim().email('Valid email required').max(255), message: z.string().trim().min(1, 'Please describe your issue').max(2000) });

export const PlansUpgradesSection = () => {
  const navigate = useNavigate();
  const { plan } = useUserPlan();
  const [guestCount, setGuestCount] = useState(0);
  const [overagePackGuests, setOveragePackGuests] = useState(0);
  const [overageEventId, setOverageEventId] = useState<string | null>(null);
  const [overageOpen, setOverageOpen] = useState(false);
  const current = getPlanByName(plan?.plan_name);
  const name = !plan?.plan_name || /^(free|starter)$/i.test(plan.plan_name) ? 'Free Trial' : current?.name ?? plan.plan_name;
  const guestLimit = current?.limits.guests ?? plan?.guest_limit ?? null;
  const totalGuestCapacity = guestLimit == null ? null : guestLimit + overagePackGuests;
  const approachingCap = totalGuestCapacity != null && guestCount >= Math.max(1, Math.floor(totalGuestCapacity * .8));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ count: guests }, { data: overageRows }, { data: latestEvent }] = await Promise.all([
        supabase.from('guests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('rsvp_invite_purchases').select('overage_blocks').eq('user_id', user.id).eq('purchase_type', 'rsvp_overage').eq('status', 'completed'),
        supabase.from('events').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setGuestCount(guests ?? 0);
      setOveragePackGuests((overageRows ?? []).reduce((sum, row) => sum + (row.overage_blocks ?? 0), 0) * 10);
      setOverageEventId(latestEvent?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, []);
  const selectPlan = (target: PlanKey) => {
    const from = current && current.mode === 'payment' && PLAN_REGISTRY[target].mode === 'payment' ? `&from=${current.key}` : '';
    navigate(`/dashboard/upgrade/checkout?plan=${target}${from}`);
  };
  return <div className={styles.destination} data-account-section>
    <div className={styles.currentPlan}>
      <div><span>Your current plan</span><strong>{name}</strong></div><span className={styles.goldBadge}>Active</span>
      {overagePackGuests > 0 && <p className={styles.positiveNote}>+{overagePackGuests} extra guests added via guest packs</p>}
      {approachingCap && overageEventId && <div className={styles.capacityNotice}><div><strong>Approaching your guest cap</strong><p>You can add a guest pack or move up a plan.</p></div><Button onClick={() => setOverageOpen(true)} className={controlStyles.secondaryButton}>Add a guest pack</Button></div>}
    </div>
    <div className={styles.pricing}><PricingSection onPlanSelect={selectPlan} /></div>
    {overageEventId && <RsvpOverageModal isOpen={overageOpen} onClose={() => setOverageOpen(false)} eventId={overageEventId} currentGuestCount={guestCount} totalCapacity={totalGuestCapacity ?? guestCount} tierLabel={name} />}
  </div>;
};

export const HelpSupportSection = () => {
  const { profile } = useProfile();
  const { plan } = useUserPlan();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  const [fullName, setFullName] = useState(() => [profile?.first_name, profile?.last_name].filter(Boolean).join(' '));
  const [email, setEmail] = useState(profile?.email ?? '');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const planName = useMemo(() => !plan?.plan_name || /^(free|starter)$/i.test(plan.plan_name) ? 'Free' : plan.plan_name, [plan?.plan_name]);
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
      const { error } = await supabase.functions.invoke('send-transactional-email', { body: { templateName: 'contact-form-message', recipientEmail: 'support@weddingwaitress.com.au', idempotencyKey: `support-${crypto.randomUUID()}`, templateData: { name: result.data.fullName, email: result.data.email, eventType: `Support Request — ${result.data.category}`, message: `[Support Category] ${result.data.category}\n[Source] Account Centre Help & Support\n[User ID] ${data.user?.id ?? '—'}\n[Plan] ${planName}\n\n${result.data.message}`, date: new Date().toISOString() } } });
      if (error) throw error;
      toast.success("Your support request has been sent. We'll reply within 24 hours."); setCategory(null); setMessage('');
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
