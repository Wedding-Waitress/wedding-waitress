import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import styles from './AdminCentrePages.module.css';
type Refund={id:string;account_owner_id:string;payment_id:string;payment_type:string;amount_minor:number;currency:string;
 livemode:boolean;status:string;access_choice:string;access_status:string;reason:string;customer_reason:string;created_at:string;updated_at:string};
type Page={customer_id:string;records:Refund[];next_cursor:string|null};
const money=(value:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(value/100);
export function AdminCustomerRefundHistory({customerId}:{customerId:string}){
 const [snapshot,setSnapshot]=useState<Page|null>(null),[cursor,setCursor]=useState<string|undefined>(),[revision,setRevision]=useState(0);
 const [error,setError]=useState(false),[loading,setLoading]=useState(true);
 const page=snapshot?.customer_id===customerId?snapshot:null;
 useEffect(()=>setCursor(undefined),[customerId]);
 useEffect(()=>{
  let active=true;setLoading(true);setError(false);setSnapshot(null);
  const timer=window.setTimeout(()=>{if(active){active=false;setError(true);setLoading(false);}},10000);
  supabase.functions.invoke('admin-payment-refund',{body:{action:'customer_history',customer_id:customerId,
   ...(cursor?{cursor}:{}),admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}})
   .then(({data,error:failure})=>{
    if(!active)return;
    if(failure||data?.success!==true||data.customer_id!==customerId||!Array.isArray(data.records)
     ||!(data.next_cursor===null||typeof data.next_cursor==='string')
     ||!data.records.every((r:Refund)=>r.account_owner_id===customerId&&Number.isSafeInteger(r.amount_minor)&&r.amount_minor>0
      &&r.currency==='aud'&&typeof r.livemode==='boolean'&&typeof r.reason==='string'&&typeof r.customer_reason==='string'
      &&['submitting','unknown','pending','requires_action','succeeded','failed','canceled'].includes(r.status)
      &&['keep','suspend'].includes(r.access_choice)&&['unchanged','waiting','suspended','incomplete'].includes(r.access_status)
      &&Number.isFinite(Date.parse(r.created_at))&&Number.isFinite(Date.parse(r.updated_at)))){setError(true);return;}
    setSnapshot(data);
   }).catch(()=>{if(active)setError(true);}).finally(()=>{if(active){window.clearTimeout(timer);setLoading(false);}});
  return()=>{active=false;window.clearTimeout(timer);};
 },[customerId,cursor,revision]);
 return <section className={styles.section} aria-label="Customer refund history"><h3>Customer refund history</h3>
  <p>Refunds requested through Wedding Waitress, including pending and failed attempts. Direct Stripe refunds are not inferred.</p>
  <button className={styles.button} disabled={loading} onClick={()=>setRevision(r=>r+1)}>Refresh customer refunds</button>
  {loading?<p role="status">Loading this customer's refund history…</p>:error?<p role="alert">Refund history is unavailable. This does not mean the customer has no refunds.</p>:page&&<>
   <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Requested</th><th>Refund amount</th><th>Status</th><th>Access decision</th><th>Access outcome</th><th>Administrator reason</th><th>Customer explanation</th><th>Mode</th></tr></thead>
   <tbody>{page.records.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('en-AU')}</td><td>{money(r.amount_minor)}</td><td>{r.status.replace(/_/g,' ')}</td><td>{r.access_choice==='keep'?'Keep access':'Suspend after successful refund'}</td><td>{r.access_status}</td><td>{r.reason}</td><td>{r.customer_reason||'—'}</td><td>{r.livemode?'Live':'Sandbox'}</td></tr>)}</tbody></table></div>
   {!page.records.length&&<p>No managed refunds recorded for this customer.</p>}
   <nav aria-label="Customer refund history pages">{cursor&&<button className={styles.button} onClick={()=>setCursor(undefined)}>Latest refunds</button>}
   {page.next_cursor&&<button className={styles.button} onClick={()=>setCursor(page.next_cursor!)}>Older refunds</button>}</nav>
  </>}
 </section>;
}
