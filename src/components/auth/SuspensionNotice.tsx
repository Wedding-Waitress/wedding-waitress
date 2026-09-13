import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/wedding-waitress-full-logo.png';
import styles from './SuspensionNotice.module.css';

export type AccountAccess = { status: 'active' | 'suspended' | 'pending_review' | 'admin_deleted'; customer_reason?: string | null; changed_at?: string | null };

export const SuspensionNotice = ({ access }: { access: AccountAccess }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const send = async () => {
    if (busy || !message.trim()) return;
    setBusy(true); setFeedback('');
    try {
      const { error } = await supabase.rpc('reply_to_account_suspension' as never, { p_message: message.trim(), p_request_id: requestId } as never);
      if (error) throw error;
      setMessage(''); setRequestId(crypto.randomUUID());
      setFeedback('Your reply has been saved for the Wedding Waitress owner to review.');
    } catch { setFeedback('Your reply could not be confirmed. Please try again.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { setFeedback('Sign out could not be confirmed. Please try again.'); return; }
    navigate('/', { replace: true });
  };
  if (access.status === 'admin_deleted') return <main className={styles.surface} data-suspension-notice>
    <header><img src={logo} alt="Wedding Waitress" /><button onClick={() => void signOut()}>Sign out</button></header>
    <section className={styles.card}><p className={styles.eyebrow}>Deleted account</p><h1>This account has been deactivated</h1>
      <p>Account information is retained for administration. Only the Wedding Waitress platform owner may restore access.
        You cannot reactivate this account yourself.</p>
      {feedback && <p role="status">{feedback}</p>}
    </section>
  </main>;
  return <main className={styles.surface} data-suspension-notice>
    <header><img src={logo} alt="Wedding Waitress" /><button onClick={() => void signOut()}>Sign out</button></header>
    <section className={styles.card} aria-labelledby="suspension-heading">
      <p className={styles.eyebrow}>My Events</p>
      <h1 id="suspension-heading">{access.status === 'pending_review' ? 'Your account is awaiting owner review' : 'Your account is suspended'}</h1>
      <p>Event planning is unavailable until the Wedding Waitress owner restores your access. Your existing information has not been deleted.</p>
      <div className={styles.reason}><h2>{access.status === 'pending_review' ? 'Review information' : 'Reason for suspension'}</h2><p>{access.customer_reason || 'Please contact the Wedding Waitress owner using the reply box below.'}</p></div>
      <label htmlFor="suspension-reply">Reply to the Wedding Waitress owner</label>
      <textarea id="suspension-reply" maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} disabled={busy} rows={5} />
      <p className={styles.hint}>Your reply is private to you and the owner. Sending a reply does not restore access or send an email.</p>
      <button className={styles.send} disabled={busy || !message.trim()} onClick={() => void send()}>{busy ? 'Saving reply…' : 'Send reply'}</button>
      {feedback && <p role="status" aria-live="polite">{feedback}</p>}
    </section>
  </main>;
};
