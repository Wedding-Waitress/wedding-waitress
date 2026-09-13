import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
type AccessDetail = { control: null | { status: string; customer_reason: string; internal_audit_reason: string }; review: null | { status: string; match_kind: string }; replies: Array<{ id: string; message: string; status: string; created_at: string }> };
export const AdminAccountAccessDetail = ({ customerId, onApproveReview }: { customerId: string; onApproveReview: () => void }) => {
  const [detail, setDetail] = useState<AccessDetail | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setDetail(null); setError(false);
    void Promise.resolve(supabase.rpc('admin_get_account_access_detail' as never, { p_target: customerId } as never)).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure || !data || !Array.isArray((data as unknown as AccessDetail).replies)) { setError(true); return; }
      setDetail(data as unknown as AccessDetail);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [customerId]);
  return <section aria-label="Account access and customer replies">
    <h3>Account access & replies</h3>
    {error ? <p role="status">Account access detail is not available yet.</p> : !detail ? <p role="status">Checking account access…</p> : <>
      {detail.control && <><p><strong>Access:</strong> {detail.control.status}</p><p><strong>Customer-visible reason:</strong> {detail.control.customer_reason || 'Not recorded'}</p><p><strong>Internal audit note:</strong> {detail.control.internal_audit_reason}</p></>}
      {detail.review?.status === 'pending' && <><p>Registration is pending owner review. A matching name or unverified phone is not proof of identity.</p><button onClick={onApproveReview}>Approve registration review</button></>}
      {detail.replies.length ? <ul>{detail.replies.map(reply => <li key={reply.id}><time>{new Date(reply.created_at).toLocaleString('en-AU')}</time><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{reply.message}</p><small>{reply.status}</small></li>)}</ul> : <p>No account access replies have been recorded.</p>}
    </>}
  </section>;
};
