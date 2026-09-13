import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { refundAmountMinor, validateRefundSelection } from '../../../supabase/functions/_shared/adminRefundRules';
import styles from './AdminCentrePages.module.css';

type Payment = { id:string; payment_type:string; customer_name:string; email:string|null };
type Quote = { original_minor:number; refunded_minor:number; remaining_minor:number; currency:string; livemode:boolean; blocked:boolean };
type Record = { id:string; payment_id:string; payment_type:string; amount_minor:number; currency:string; status:string; access_choice:string; access_status:string; reason:string; created_at:string };
const money=(minor:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(minor/100);
async function invoke(body:object) {
 const {data,error}=await supabase.functions.invoke('admin-payment-refund',{body:{...body,admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}});
 if(error||data?.error||data?.success!==true)throw new Error(data?.error||'Refund service is unavailable or not activated. No outcome is confirmed.');
 return data;
}
export function AdminRefundButton({payment}:{payment:Payment}) {
 const [open,setOpen]=useState(false);
 if(payment.payment_type==='promotion_no_cost')return <span>No payment to refund</span>;
 return <><button className={`${styles.button} ${styles.danger}`} onClick={()=>setOpen(true)}>Refund payment</button>
 {open&&<AdminRefundDialog payment={payment} onClose={()=>setOpen(false)}/>}</>;
}
export function AdminRefundDialog({payment,onClose}:{payment:Payment;onClose:()=>void}) {
 const [quote,setQuote]=useState<Quote|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState('full'),[amount,setAmount]=useState(''),[choice,setChoice]=useState(''),[reason,setReason]=useState(''),[customerReason,setCustomerReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [requestId]=useState(()=>crypto.randomUUID()),[result,setResult]=useState<Record|null>(null),[attempted,setAttempted]=useState(false);
 useEffect(()=>{let active=true;invoke({action:'quote',payment_type:payment.payment_type,payment_id:payment.id}).then(data=>{if(active)setQuote(data.quote);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[payment.id,payment.payment_type]);
 let minor=0,valid=false;
 try{minor=mode==='full'?(quote?.remaining_minor||0):refundAmountMinor(amount);validateRefundSelection(minor,quote?.remaining_minor||0,choice,reason,customerReason);valid=!!quote&&!quote.blocked&&confirmed;}catch{/* Validation is shown by disabled confirmation, never triggers a request. */}
 const submit=async()=>{
  if(!valid||busy||attempted)return;setBusy(true);setAttempted(true);setError('');
  try{const data=await invoke({action:'submit',payment_id:payment.id,payment_type:payment.payment_type,request_id:requestId,amount_minor:minor,access_choice:choice,reason:reason.trim(),customer_reason:choice==='suspend'?customerReason.trim():'',confirmed:true});setResult(data.record);}
  catch(e){setError(e instanceof Error?e.message:'Outcome unconfirmed. Refresh status before any further request.');}finally{setBusy(false);}
 };
 const refresh=async()=>{if(busy)return;setBusy(true);setError('');try{const data=await invoke({action:'refresh',request_id:requestId});setResult(data.record);}catch(e){setError(e instanceof Error?e.message:'Status unavailable.');}finally{setBusy(false);}};
 return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}><DialogContent className={styles.dialog} overlayClassName={styles.overlay}>
 <DialogHeader><DialogTitle>Refund payment</DialogTitle><DialogDescription>{payment.customer_name} · {payment.email||'Recorded customer'} · {payment.payment_type.replace(/_/g,' ')}</DialogDescription></DialogHeader>
 <div className={styles.dialogText}>
 <p>This returns money to the original payment method. It does not delete customer information or automatically cancel subscriptions.</p>
 {loading&&<p role="status">Checking the actual Stripe payment…</p>}
 {quote&&<><p><strong>{quote.livemode?'LIVE payment — real money':'TEST payment — no real money'}</strong></p><dl><dt>Original payment</dt><dd>{money(quote.original_minor)}</dd><dt>Previously refunded</dt><dd>{money(quote.refunded_minor)}</dd><dt>Remaining refundable</dt><dd>{money(quote.remaining_minor)}</dd></dl>{quote.blocked&&<p role="alert">An outstanding refund must be reconciled before another request.</p>}</>}
 <label>Refund amount<select aria-label="Refund amount" className={styles.select} value={mode} onChange={e=>{setMode(e.target.value);setConfirmed(false);}} disabled={attempted||busy}><option value="full">Full remaining refund</option><option value="partial">Partial refund</option></select></label>
 {mode==='partial'&&<label>Partial refund (AUD)<input className={styles.input} inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setConfirmed(false);}} disabled={attempted||busy}/></label>}
 <label>Account access after a successful refund<select aria-label="Account access after refund" className={styles.select} value={choice} onChange={e=>{setChoice(e.target.value);setConfirmed(false);}} disabled={attempted||busy}><option value="">Choose access outcome…</option><option value="keep">Keep existing access and plan expiry unchanged</option><option value="suspend">Suspend planning access after the refund succeeds</option></select></label>
 <label>Administrator reason<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} disabled={attempted||busy}/></label>
 {choice==='suspend'&&<><p>Pending or failed refunds do not suspend access. A successful refund will use the existing suspension rules.</p><label>Suspension reason shown to customer<textarea maxLength={2000} value={customerReason} onChange={e=>{setCustomerReason(e.target.value);setConfirmed(false);}} disabled={attempted||busy}/></label></>}
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={attempted||busy}/> I confirm this customer, refund amount and access choice.</label>
 {error&&<p role="alert" className={styles.warning}>{error}</p>}
 {result&&<p role="status">Refund: {result.status}. Access: {result.access_status}. {result.access_status==='incomplete'?'Refund and access are separate outcomes. Review the account; suspension was not fully confirmed.':''}</p>}
 <div className={styles.actionRow}>
 {!attempted?<button className={`${styles.button} ${styles.green}`} disabled={!valid||loading||busy} onClick={()=>void submit()}>Confirm refund</button>:<button className={styles.button} disabled={busy} onClick={()=>void refresh()}>Refresh refund status</button>}
 <button className={styles.button} disabled={busy} onClick={onClose}>{attempted?'Close':'Cancel'}</button></div>
 </div></DialogContent></Dialog>;
}
export function AdminRefundHistory() {
 const [payments,setPayments]=useState<(Payment&{amount_minor:number})[]>([]);
 const [records,setRecords]=useState<Record[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const load=async()=>{if(busy)return;setBusy(true);setError('');try{const data=await invoke({action:'history'});setRecords(data.records);setPayments(data.payments||[]);setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'History unavailable.');}finally{setBusy(false);}};
 const refresh=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{const data=await invoke({action:'refresh',request_id:id});setRecords(rows=>rows.map(row=>row.id===id?data.record:row));}catch(e){setError(e instanceof Error?e.message:'Status unavailable.');}finally{setBusy(false);}};
 return <section className={styles.section} aria-label="Refund history"><h2>Refund history</h2><p>Most recent 100 managed refunds. Existing refunds made outside this feature are not inferred.</p><button className={styles.button} disabled={busy} onClick={()=>void load()}>Load refund history</button>{error&&<p role="alert">{error}</p>}
 {loaded&&payments.length>0&&<><h3>Verified plan payments</h3><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Customer</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.customer_name}</td><td>{money(p.amount_minor)}</td><td><AdminRefundButton payment={p}/></td></tr>)}</tbody></table></div></>}
 {loaded&&<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Payment</th><th>Amount</th><th>Refund status</th><th>Access outcome</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{r.payment_type.replace(/_/g,' ')} · …{r.payment_id.slice(-8)}</td><td>{money(r.amount_minor)}</td><td>{r.status}</td><td>{r.access_status}</td><td>{r.reason}</td><td><button className={styles.button} disabled={busy} onClick={()=>void refresh(r.id)}>Refresh status</button></td></tr>)}</tbody></table>{!records.length&&<p>No managed refunds recorded.</p>}</div>}</section>;
}
