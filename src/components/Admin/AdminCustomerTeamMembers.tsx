import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';

type Entry={id:string;kind:'member'|'invitation';name:string;email:string|null;role:string;status:string;is_owner:boolean};
type Roster={entries:Entry[];active_members:number;recorded_members:number;pending_invitations:number;maximum_seats:number};
function validRoster(value:unknown):value is Roster {
 if(!value||typeof value!=='object')return false;const data=value as Roster;
 return Array.isArray(data.entries)&&['active_members','recorded_members','pending_invitations','maximum_seats'].every(key=>Number.isInteger((data as any)[key])&&(data as any)[key]>=0)
  &&data.entries.every(row=>row&&typeof row.id==='string'&&['member','invitation'].includes(row.kind)&&typeof row.name==='string'
   &&(row.email===null||typeof row.email==='string')&&typeof row.role==='string'&&typeof row.status==='string'&&typeof row.is_owner==='boolean');
}
function ScopedRoster({customerId,revision}:{customerId:string;revision?:string}) {
 const [data,setData]=useState<Roster|null>(null);const [error,setError]=useState(false);
 useEffect(()=>{let active=true;setData(null);setError(false);
  void Promise.resolve(supabase.rpc('admin_get_customer_team_roster' as never,{p_target:customerId} as never))
   .then(result=>{if(!active)return;if(result.error||!validRoster(result.data)){setError(true);return;}setData(result.data);})
   .catch(()=>{if(active)setError(true);});return()=>{active=false;};
 },[customerId,revision]);
 if(error)return <p role="alert">Team members could not be loaded. No account changes were made.</p>;
 if(!data)return <p role="status">Loading team members…</p>;
 return <div><p>{data.active_members} active members · {data.pending_invitations} pending invitations · maximum {data.maximum_seats} seats, including the owner.</p>
  {data.entries.length===0?<p>No team membership or invitation records available.</p>:<ul>{data.entries.map(row=><li key={`${row.kind}:${row.id}`}>
   <strong>{row.name||'Name not recorded'}{row.is_owner?' — Account owner':''}</strong>
   <span style={{display:'block',overflowWrap:'anywhere'}}>{row.email||'Email not recorded'}</span>
   <span>{row.role} · {row.status}</span>
  </li>)}</ul>}
 </div>;
}
export function AdminCustomerTeamMembers({customerId,revision,ready,activeCount,recordedCount}:{customerId:string;revision?:string;ready:boolean;activeCount?:number;recordedCount?:number}) {
 const [open,setOpen]=useState(false);
 const count=`${activeCount??'Not available'} active of ${recordedCount??'Not available'} recorded seats`;
 if(!ready)return <span title="Detailed team members will be available after the matching backend update is released.">{count}</span>;
 return <details onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary aria-label={`Team members: ${count}`}>{activeCount===undefined&&recordedCount===undefined?'View team members':count}</summary>
  {open&&<ScopedRoster customerId={customerId} revision={revision}/>}
 </details>;
}
