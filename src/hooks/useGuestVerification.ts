import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
type Session={token:string;expiresAt:number};
type Clock={phase:'invitation'|'seating';serverNow:number;observedAt:number;cutoff:number;eventTimezone:string};
const key=(eventId:string)=>'ww-guest-verification:'+eventId;
export function useGuestVerification(eventId:string|undefined){
 const [clock,setClock]=useState<Clock|null>(null);
 const [session,setSession]=useState<Session|null>(null);
 const [party,setParty]=useState<any[]>([]);
 const [tick,setTick]=useState(0);
 const generation=useRef(0);
 const sessionRef=useRef<Session|null>(null);sessionRef.current=session;
 const clear=useCallback(()=>{sessionRef.current=null;setSession(null);setParty([]);if(eventId)try{localStorage.removeItem(key(eventId));}catch{}},[eventId]);
 const serverNow=clock?clock.serverNow+performance.now()-clock.observedAt:Infinity;
 const phase=clock?.phase==='seating'||(clock&&serverNow>=clock.cutoff)?'seating':clock?'invitation':null;
 const active=phase==='invitation'&&session&&session.expiresAt>serverNow;
 useEffect(()=>{const timer=window.setInterval(()=>setTick(v=>v+1),1000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(session&&!active)clear();},[tick,active,session,clear]);
 const refresh=useCallback(async(candidate?:Session)=>{
  const current=candidate||sessionRef.current;const request=generation.current;
  if(!eventId||!current)return false;
  const {data,error}=await (supabase as any).rpc('qr_guest_verified_party',{_event_id:eventId,_session:current.token});
  if(request!==generation.current)return false;
  if(error||!data||!Array.isArray(data.guests)){clear();return false;}
  setParty(data.guests);return true;
 },[eventId,clear]);
 useEffect(()=>{
  let stopped=false;++generation.current;setClock(null);setSession(null);setParty([]);
  if(!eventId)return;
  const readClock=async()=>{
   const {data,error}=await (supabase as any).rpc('qr_guest_app_clock',{_event_id:eventId});
   if(stopped)return;
   if(error||!data||!['invitation','seating'].includes(data.phase)){setClock(null);setParty([]);return;}
   const server=Date.parse(data.server_now),cutoff=Date.parse(data.cutoff);
   if(!Number.isFinite(server)){setClock(null);setParty([]);return;}
   setClock({phase:data.phase,serverNow:server,observedAt:performance.now(),cutoff:Number.isFinite(cutoff)?cutoff:0,eventTimezone:data.event_timezone});
   if(data.phase==='seating'){clear();return;}
   if(!sessionRef.current){
    let stored:Session|null=null;try{stored=JSON.parse(localStorage.getItem(key(eventId))||'null');}catch{}
    if(stored&&/^[a-f0-9]{64}$/.test(stored.token)&&stored.expiresAt>server&&stored.expiresAt<=server+7200000){
     if(await refresh(stored)){if(!stopped){sessionRef.current=stored;setSession(stored);}}
    }
   }
  };
  void readClock();const timer=window.setInterval(readClock,30000);
  const onVisibility=()=>{if(!document.hidden)void readClock();};document.addEventListener('visibilitychange',onVisibility);
  return()=>{stopped=true;++generation.current;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
 },[eventId,refresh,clear]);
 const accept=useCallback(async(data:any)=>{
  if(data?.event_id!==eventId||typeof data.session!=='string'||!/^[a-f0-9]{64}$/.test(data.session))return false;
  const next={token:data.session,expiresAt:Date.parse(data.expires_at)};
  if(!Number.isFinite(next.expiresAt))return false;
  if(!await refresh(next))return false;
  sessionRef.current=next;setSession(next);try{localStorage.setItem(key(eventId!),JSON.stringify(next));}catch{}
  return true;
 },[eventId,refresh]);
 return{phase,eventTimezone:clock?.eventTimezone,token:active?session!.token:undefined,party:active?party:[],verifiedFor:(id:string)=>!!active&&party.some(g=>g.id===id),refresh,accept,clear};
}
