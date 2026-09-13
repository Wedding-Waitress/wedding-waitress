import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import styles from './AdminCentrePages.module.css';
type Row=Record<string,string|number|null>;
export type OperationsSnapshot={generated_at:string;records:Record<string,Row[]|null>;availability:Record<string,string>;row_limit:number;queue:Record<string,number|null>;configuration:Record<string,boolean>;limitations:string[]};
type Page='support'|'messages-credits'|'system-health'|'admin-activity';
const words=(s:string)=>s.replace(/[_-]/g,' ');
const time=(s:unknown)=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleString('en-AU'):String(s??'—');
export const filterOperationalRows=(rows:Row[],search:string,status:string,context?:(row:Row)=>string)=>rows.filter(row=>(!search||Object.values(row).some(v=>String(v??'').toLowerCase().includes(search.toLowerCase()))||context?.(row).toLowerCase().includes(search.toLowerCase()))&&(!status||[row.status,row.result,row.email_status,row.sms_status].includes(status)));
const definitions:Record<Page,{title:string;description:string;sources:Array<[string,string,string[]]>}>={
  support:{title:'Support',description:'Customer enquiries and audited status changes. No outgoing messages are sent here.',sources:[['tickets','Support tickets',['full_name','contact_email','category','status','created_at']]]},
  'messages-credits':{title:'Messages & Credits',description:'Recorded operational email and SMS activity, shared RSVP allowances and purchases. Accepted does not mean delivered.',sources:[['emails','Operational email',['customer_id','event_id','template_name','status','accepted_at','delivered_at']],['email_queue','Transactional delivery attempts',['queue_name','status','attempts','available_at','locked_at','updated_at']],['guest_notifications','Guest-added notification workflow',['event_id','email_status','sms_status','created_at']],['balances','Shared email & SMS credit balances',['user_id','event_id','total','used','remaining','updated_at']],['purchases','Credit and invitation purchases',['user_id','event_id','purchase_type','amount_paid','status','created_at']],['usage','Recorded communication usage',['user_id','event_id','channel','status','sent_at']],['credit_transactions','Credit ledger',['user_id','kind','amount','created_at']]]},
  'system-health':{title:'System Health',description:'Current queue counts and configuration presence. Unknown is never shown as healthy.',sources:[]},
  'admin-activity':{title:'Admin Activity',description:'Actual administrator, account lifecycle and support actions. No OTPs, tokens or raw audit payloads.',sources:[['admin_activity','Administrator actions',['administrator_id','action','target_type','target_id','reason','result','created_at']],['lifecycle_activity','Account lifecycle actions',['actor_user_id','action','account_owner_id','occurred_at']],['support_activity','Support actions',['actor_id','ticket_id','status','reason','recorded_at']]]},
};
function OperationsPage({page}:{page:Page}){
  const [data,setData]=useState<OperationsSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[selected,setSelected]=useState<{source:string;row:Row}|null>(null);
  const [newStatus,setNewStatus]=useState(''),[reason,setReason]=useState(''),[saving,setSaving]=useState(false),[actionError,setActionError]=useState('');
  const [reviewedFailure,setReviewedFailure]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError('');setData(null);
    try {
      const {data:result,error:failure}=await supabase.functions.invoke('admin-operations-snapshot',{body:{admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}});
      if(failure||result?.error)throw new Error(result?.error||'The owner reporting service is unavailable or recent verification has expired. No empty or healthy state has been inferred.');
      if(!result?.records||!result?.availability)throw new Error('The reporting response was incomplete.');
      setData(result as OperationsSnapshot);
    }catch(e){setError(e instanceof Error?e.message:'Reporting could not be checked.');}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{setReason('');setActionError('');setReviewedFailure(false);setNewStatus(String(selected?.row.status||'open'));},[selected]);
  const canRecover=selected?.source==='admin_activity'&&selected.row.result==='failed'&&selected.row.action==='blocked_account_session_revocation'&&selected.row.target_type==='account';
  const recover=async()=>{
    if(!canRecover||!reviewedFailure||saving||reason.trim().length<5)return;
    setSaving(true);setActionError('');
    try{
      const {data:result,error:failure}=await supabase.functions.invoke('admin-account-action',{body:{action:'retry_failed_session_revocation',target_id:selected!.row.id,reason:reason.trim(),reviewed_failure:true,admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}});
      if(failure||result?.success!==true||!['recovered','already_recovered'].includes(result?.result?.result))throw new Error(result?.error||'Recovery could not be confirmed. Refresh the recorded history before trying again.');
      setSelected(null);await load();
    }catch(e){setActionError(e instanceof Error?e.message:'Recovery could not be confirmed.');setReviewedFailure(false);}finally{setSaving(false);}
  };
  const config=definitions[page];
  const options=useMemo(()=>Array.from(new Set(config.sources.flatMap(([source])=>(data?.records[source]||[]).flatMap(row=>[row.status,row.result,row.email_status,row.sms_status])).filter((v):v is string=>typeof v==='string'))).sort(),[config,data]);
  const label=(key:string,value:Row[string])=>{
    if(key.endsWith('_id')&&data){
      const customer=(data.records.customers||[]).find(r=>r.id===value),event=(data.records.events||[]).find(r=>r.id===value);
      if(customer)return [customer.first_name,customer.last_name].filter(Boolean).join(' ');
      if(event)return String(event.name);
    }
    if(key.endsWith('_at'))return time(value);
    if(key==='amount_paid')return new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(Number(value||0));
    return ['status','result','email_status','sms_status','kind','purchase_type'].includes(key)?words(String(value??'—')):String(value??'—');
  };
  const save=async()=>{
    if(!selected)return;setSaving(true);setActionError('');
    try {
      const {data:result,error:failure}=await supabase.functions.invoke('admin-account-action',{body:{action:'set_support_ticket_status',target_id:selected.row.id,status:newStatus,reason:reason.trim(),admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}});
      if(failure||result?.error)throw new Error(result?.error||'The change could not be confirmed. Verify owner access and try again.');
      setSelected(null);await load();
    }catch(e){setActionError(e instanceof Error?e.message:'The change could not be confirmed.');}finally{setSaving(false);}
  };
  return <div className={styles.page}>
    <div className={styles.sectionHeader}><div><h2>{config.title}</h2><p>{config.description}</p></div></div>
    <div className={styles.freshness}><span>Last checked: {data?time(data.generated_at):'Not verified'}</span><button className={styles.button} disabled={loading} onClick={()=>void load()}>Refresh</button></div>
    {loading&&<p role="status">Checking owner reporting…</p>}
    {error&&<div role="alert" className={styles.unavailable}><strong>Reporting unavailable</strong><p>{error}</p></div>}
    {data&&<>
      {page!=='system-health'&&<div className={styles.toolbar}><input className={styles.input} aria-label="Search operational records" placeholder="Search names, categories, IDs or actions…" value={search} onChange={e=>setSearch(e.target.value)}/><select className={styles.select} aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{options.map(v=><option key={v} value={v}>{words(v)}</option>)}</select></div>}
      {page==='system-health'&&<>
        <section className={styles.section}><div className={styles.sectionHeader}><h2>Transactional email queue</h2></div><div className={styles.metrics}>{Object.entries(data.queue).map(([key,value])=><div key={key} className={styles.metric} data-attention={key==='failed'&&Number(value)>0}><span>{words(key)}</span><strong>{value===null?'Unknown':value}</strong></div>)}</div></section>
        <section className={styles.section}><div className={styles.sectionHeader}><h2>Integration configuration</h2></div><div className={styles.metrics}>{Object.entries(data.configuration).map(([key,value])=><div className={styles.metric} key={key} data-attention={!value}><span>{words(key)}</span><strong>{value?'Configured':'Missing'}</strong></div>)}</div><p>Provider reachability, webhook registration and scheduler activity are not checked by this read-only report.</p></section>
        <section className={styles.section}><div className={styles.sectionHeader}><h2>Reporting sources</h2></div><ul>{Object.entries(data.availability).map(([key,value])=><li key={key}>{words(key)}: {value==='available'?'Query succeeded':'Unknown / unavailable'}</li>)}</ul></section>
      </>}
      {config.sources.map(([source,title,columns])=>{
        const rows=filterOperationalRows(data.records[source]||[],search,status,row=>Object.entries(row).map(([key,value])=>label(key,value)).join(' ')),available=data.availability[source]==='available';
        return <section className={styles.section} key={source}><div className={styles.sectionHeader}><div><h2>{title}</h2><p>Up to {data.row_limit} most recent recorded entries.</p></div></div>
          {!available?<p className={styles.unavailable}>This source could not be read. Its data is unknown.</p>:rows.length===0?<p>{search||status?'No recorded entries match these filters.':'No entries have been recorded in this source.'}</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr>{columns.map(key=><th key={key}>{words(key)}</th>)}<th>Details</th></tr></thead><tbody>{rows.map(row=><tr key={String(row.id)}>{columns.map(key=><td key={key}>{label(key,row[key])}</td>)}<td><button className={styles.button} onClick={()=>setSelected({source,row})}>View details</button></td></tr>)}</tbody></table></div>}
        </section>;
      })}
      <section className={styles.section}><div className={styles.sectionHeader}><h2>Reporting limitations</h2></div><ul>{data.limitations.map(text=><li key={text}>{text}</li>)}</ul><p>Failure statuses are shown where recorded; raw provider error bodies are not exposed. Support priority is not currently recorded.</p>{page==='messages-credits'&&<p>The historical account credit ledger is separate from current event-specific shared email & SMS allowances. No legacy bonus is treated as a current RSVP allowance.</p>}</section>
    </>}
    <Dialog open={!!selected} onOpenChange={open=>!open&&!saving&&setSelected(null)}><DialogContent className={styles.dialog} overlayClassName={styles.overlay}><DialogHeader><DialogTitle>{selected?.source==='tickets'?'Support ticket':'Recorded activity'}</DialogTitle><DialogDescription>Actual recorded fields. Customer and event IDs are preserved for traceability.</DialogDescription></DialogHeader><div className={styles.dialogText} style={{maxHeight:'65vh',overflowY:'auto'}}>
      {selected&&<dl>{Object.entries(selected.row).map(([key,value])=><React.Fragment key={key}><dt>{words(key)}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{label(key,value)}{key.endsWith('_id')&&value&&label(key,value)!==String(value)&&<small> ({value})</small>}</dd></React.Fragment>)}</dl>}
      {canRecover&&<><p>Retry only session revocation for this already blocked account. The server rechecks its current block and records the outcome. This does not replay suspension/deletion, restore access, change billing or send messages.</p><label>Reason for session recovery<textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label><label><input type="checkbox" checked={reviewedFailure} onChange={e=>setReviewedFailure(e.target.checked)}/>I have reviewed the failed operation and the current account.</label>{actionError&&<p role="alert">{actionError}</p>}<div className={styles.toolbar}><button className={`${styles.button} ${styles.primary}`} disabled={saving||!reviewedFailure||reason.trim().length<5} onClick={()=>void recover()}>{saving?'Recovering…':'Retry session revocation'}</button><button className={styles.button} disabled={saving} onClick={()=>setSelected(null)}>Cancel</button></div></>}
      {selected?.source==='tickets'&&<><label>Status<select className={styles.select} value={newStatus} onChange={e=>setNewStatus(e.target.value)}>{['open','in_progress','resolved','closed'].map(v=><option key={v} value={v}>{words(v)}</option>)}</select></label><label>Reason for this audited change<textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>{actionError&&<p role="alert">{actionError}</p>}<div className={styles.toolbar}><button className={`${styles.button} ${styles.primary}`} disabled={saving||reason.trim().length<5||newStatus===selected.row.status} onClick={()=>void save()}>{saving?'Saving…':'Save status'}</button><button className={styles.button} disabled={saving} onClick={()=>setSelected(null)}>Cancel</button></div></>}
      <Link to="/admin/customers" className={styles.button}>Customer records</Link>{' '}<Link to="/admin/events" className={styles.button}>Event records</Link>
    </div></DialogContent></Dialog>
  </div>;
}
export const AdminSupportPage=()=> <OperationsPage page="support"/>;
export const AdminMessagesCreditsPage=()=> <OperationsPage page="messages-credits"/>;
export const AdminSystemHealthPage=()=> <OperationsPage page="system-health"/>;
export const AdminActivityPage=()=> <OperationsPage page="admin-activity"/>;
