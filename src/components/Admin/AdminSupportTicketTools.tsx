import React,{useCallback,useEffect,useRef,useState} from 'react';
import { supabase } from '@/integrations/supabase/client';
import styles from './AdminCentrePages.module.css';
type Cursor={at:string;id:string};
type Reply={id:string;message:string;reason:string;created_at:string;status:string;accepted_at:string|null;delivered_at:string|null};
const credentials=()=>({admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')});
const when=(value:string|null)=>value?new Date(value).toLocaleString('en-AU'):'Not confirmed';
export function AdminSupportTicketTools({ticketId,contactEmail,priority:initialPriority,onPriorityChange}:{ticketId:string;contactEmail:string;priority:string;onPriorityChange:(priority:string)=>void}){
 const [priority,setPriority]=useState(initialPriority||'normal'),[savedPriority,setSavedPriority]=useState(initialPriority||'normal'),[priorityReason,setPriorityReason]=useState('');
 const [message,setMessage]=useState(''),[replyReason,setReplyReason]=useState(''),[reviewed,setReviewed]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [replies,setReplies]=useState<Reply[]>([]),[cursor,setCursor]=useState<Cursor|null>(null),[historyLoading,setHistoryLoading]=useState(true),[historyError,setHistoryError]=useState('');
 const replyRequest=useRef<{id:string;message:string;reason:string}|null>(null),generation=useRef(0);
 const loadHistory=useCallback(async(after?:Cursor)=>{
  const requestedGeneration=generation.current;setHistoryLoading(true);setHistoryError('');
  try{
   const {data,error}=await supabase.functions.invoke('admin-support',{body:{action:'history',ticket_id:ticketId,...(after?{cursor:after}:{}),...credentials()}});
   if(error||data?.error||!Array.isArray(data?.replies)||typeof data?.has_more!=='boolean'||data.has_more&&!data.cursor)throw new Error('Reply history is unavailable. No empty history has been inferred.');
   if(generation.current!==requestedGeneration)return;
   setReplies(current=>after?[...current,...data.replies.filter((row:Reply)=>!current.some(existing=>existing.id===row.id))]:data.replies);setCursor(data.has_more?data.cursor:null);
  }catch(e){if(generation.current===requestedGeneration)setHistoryError(e instanceof Error?e.message:'Reply history is unavailable.');}
  finally{if(generation.current===requestedGeneration)setHistoryLoading(false);}
 },[ticketId]);
 useEffect(()=>{void loadHistory();return()=>{generation.current+=1;};},[loadHistory]);
 const savePriority=async()=>{
  if(saving||priority===savedPriority||priorityReason.trim().length<5)return;
  setSaving(true);setError('');setNotice('');
  try{const {data,error}=await supabase.functions.invoke('admin-support',{body:{action:'priority',ticket_id:ticketId,priority,reason:priorityReason.trim(),...credentials()}});if(error||data?.success!==true)throw new Error(data?.error||'Priority change could not be confirmed.');setSavedPriority(priority);setPriorityReason('');setNotice('Priority updated and recorded.');onPriorityChange(priority);}catch(e){setError(e instanceof Error?e.message:'Priority change could not be confirmed.');}finally{setSaving(false);}
 };
 const sendReply=async()=>{
  if(saving||!reviewed||message.trim().length<5||replyReason.trim().length<5)return;
  const content=message.trim(),reason=replyReason.trim();
  if(!replyRequest.current||replyRequest.current.message!==content||replyRequest.current.reason!==reason)replyRequest.current={id:crypto.randomUUID(),message:content,reason};
  setSaving(true);setError('');setNotice('');
  try{
   const {data,error}=await supabase.functions.invoke('admin-support',{body:{action:'reply',ticket_id:ticketId,reply_id:replyRequest.current.id,message:content,reason,reviewed_recipient:true,...credentials()}});
   if(error||data?.recorded!==true)throw new Error(data?.error||'The reply outcome is unknown. Refresh its history before retrying; the same request is retained.');
   if(data.accepted===true){setMessage('');setReplyReason('');replyRequest.current=null;}
   setReviewed(false);setNotice(data.delivered===true?'Delivery to the recipient email server is recorded.':data.accepted===true?'Reply accepted by the email provider. Delivery is not yet confirmed.':data.status==='review_required'?'This reply is already recorded and requires delivery review. It was not sent again.':'Reply recorded. Provider acceptance is not confirmed. Check the history before retrying the same reply.');
   await loadHistory();
  }catch(e){setError(e instanceof Error?e.message:'Reply outcome is unknown. Check its history before retrying.');setReviewed(false);}finally{setSaving(false);}
 };
 return <section className={styles.supportTools} aria-label="Support priority and replies">
  <h3>Ticket priority</h3>
  <label>Priority<select className={styles.select} value={priority} disabled={saving} onChange={e=>setPriority(e.target.value)}>{['low','normal','high','urgent'].map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label>
  <label>Reason for priority change<textarea maxLength={1000} value={priorityReason} disabled={saving} onChange={e=>setPriorityReason(e.target.value)}/></label>
  <button type="button" className={`${styles.button} ${styles.green}`} disabled={saving||priority===savedPriority||priorityReason.trim().length<5} onClick={()=>void savePriority()}>Save priority</button>
  <h3>Reply to this enquiry</h3><p>Recipient: <strong>{contactEmail}</strong>. Replies are transactional support messages.</p>
  <label>Reply message<textarea maxLength={5000} value={message} disabled={saving} onChange={e=>{setMessage(e.target.value);setReviewed(false);}}/></label>
  <label>Reason for sending this reply<textarea maxLength={1000} value={replyReason} disabled={saving} onChange={e=>{setReplyReason(e.target.value);setReviewed(false);}}/></label>
  <label className={styles.supportReplyReview}><input type="checkbox" checked={reviewed} disabled={saving} onChange={e=>setReviewed(e.target.checked)}/>I have reviewed the recorded recipient and this reply.</label>
  <button type="button" className={`${styles.button} ${styles.green}`} disabled={saving||!reviewed||message.trim().length<5||replyReason.trim().length<5} onClick={()=>void sendReply()}>{saving?'Saving…':'Send support reply'}</button>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <h3>Reply history</h3><button type="button" className={styles.button} disabled={historyLoading||saving} onClick={()=>void loadHistory()}>Refresh reply history</button>
  {historyLoading&&<p role="status">Checking recorded replies…</p>}{historyError&&<p role="alert">{historyError}</p>}
  {!historyLoading&&!historyError&&replies.length===0&&<p>No replies have been recorded for this ticket.</p>}
  {replies.map(row=><article key={row.id}><p><strong>{when(row.created_at)} · {row.status.replaceAll('_',' ')}</strong></p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.message}</p><p>Audit reason: {row.reason}</p><p>Provider acceptance: {when(row.accepted_at)}. Delivery: {when(row.delivered_at)}.</p></article>)}
  {cursor&&<button type="button" className={styles.button} disabled={historyLoading||saving} onClick={()=>void loadHistory(cursor)}>Load older replies</button>}
 </section>;
}
