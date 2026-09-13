import {useEffect,useState} from 'react';
import {Timer} from 'lucide-react';
import {CustomerCountdownCircle} from '@/components/Dashboard/CustomerCountdownCircle';
import {calculateCustomerTimeRemaining,type CustomerCountdownEvent} from '@/lib/customerEventCountdown';
import styles from '@/components/Dashboard/MyEventsPage.module.css';
type SavedEvent=CustomerCountdownEvent&{id:string;user_id:string;name:string};
function savedEvent(value:unknown,ownerId:string,id:string):value is SavedEvent {
 if(!value||typeof value!=='object')return false;const row=value as Record<string,unknown>;
 const date=row.date;if(row.id!==id||row.user_id!==ownerId||typeof row.name!=='string'||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return false;
 return ['start_time','finish_time'].every(key=>row[key]===null||typeof row[key]==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(row[key] as string));
}
export function AdminReadOnlyEventCountdown({ownerId,customer,events}:{ownerId:string;customer:unknown;events:unknown[]}){
 const row=customer&&typeof customer==='object'?customer as Record<string,unknown>:null;
 const selected=row?.user_id===ownerId&&typeof row.display_countdown_event_id==='string'?row.display_countdown_event_id:null;
 const candidates=selected?events.filter(value=>value&&typeof value==='object'&&(value as any).id===selected):[];
 const candidate=candidates.length===1?(candidates[0] as any).saved_event:null;
 const event=selected&&savedEvent(candidate,ownerId,selected)?candidate:null;
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{if(!event)return;setNow(new Date());const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(timer);},[ownerId,selected,event?.date,event?.start_time,event?.finish_time]);
 const result=calculateCustomerTimeRemaining(event,now);
 return <section aria-label="Read-only saved event countdown" className={`${styles.countdownPanel} p-4`}>
  <div className={styles.countdownTimer}><div className={styles.countdownIntro}><p className={`text-muted-foreground text-lg ${styles.countdownMessage}`}><span className="inline-flex items-center justify-center gap-2"><Timer size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true"/>{event?result.eventState==='in_progress'?'Your event is in progress':result.eventState==='finished'?'Event finished':'Your event details & countdown timer':'Saved event countdown is unavailable'}</span></p>{event&&<p className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight ${styles.eventTitle}`}>{event.name}</p>}</div>
   <div className={styles.countdownCircles}>{(['months','weeks','hours','seconds'] as const).map(type=><CustomerCountdownCircle key={type} type={type} label={type[0].toUpperCase()+type.slice(1)} value={event?result[type]:'--'} now={now}/>)}</div>
  </div><p className="text-sm mt-3">{event?'Uses the saved countdown selection and the existing customer browser-local calculation (including approximate 30-day months). This is not a billing or access-expiry calculation.':'No verified saved selection and dated owned event are available. The first event has not been selected or saved on the customer’s behalf.'}</p>
 </section>;
}
