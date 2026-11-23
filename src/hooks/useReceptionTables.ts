import { useEffect, useRef, useState } from 'react';
import { getCacheGeneration, getCacheUserId, registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { normalizeRsvp } from '@/lib/rsvp';
import { supabase } from '@/integrations/supabase/client';
import { parseHeadSeatingOrder, type HeadSeatEntry, type TablePurpose } from '@/lib/headTable';

export type ReceptionTableType = 'round' | 'square' | 'long';

export interface ReceptionTable {
  id: string;
  name: string | null;
  table_no: number | null;
  limit_seats: number;
  table_type: ReceptionTableType;
  notes: string | null;
  table_purpose: TablePurpose;
  head_seating_order: HeadSeatEntry[];
  guest_count: number;
  occupied_seat_numbers: number[];
}

/**
 * Phase 1A — Step 2
 * Read-only hook that loads synced tables for an event.
 * The Reception editor uses these as the source of truth — never duplicates them.
 */
export type ReceptionTableSource={id:string;name:string|null;table_no:number|null;limit_seats:number;table_type:string;notes:string|null;table_purpose:string;head_seating_order:unknown};
export function receptionTablesFromRecords(tableRows:ReceptionTableSource[],guestRows:{table_id:string|null;seat_no:number|null}[]):ReceptionTable[] {
    const occupancy = new Map<string, { count: number; seats: number[] }>();
    for (const guest of guestRows ?? []) {
      if (!guest.table_id) continue;
      const current = occupancy.get(guest.table_id) ?? { count: 0, seats: [] };
      current.count += 1;
      if (typeof guest.seat_no === 'number' && guest.seat_no > 0) {
        current.seats.push(guest.seat_no);
      }
      occupancy.set(guest.table_id, current);
    }

    return (tableRows ?? []).map((table) => {
      const occupied = occupancy.get(table.id) ?? { count: 0, seats: [] };
      const type = table.table_type;
      const tablePurpose: TablePurpose = table.table_purpose === 'head' ? 'head' : 'standard';
      const headOrder = parseHeadSeatingOrder(table.head_seating_order);
      return {
        ...table,
        table_type: type === 'square' || type === 'long' ? type : 'round',
        table_purpose: tablePurpose,
        head_seating_order: headOrder,
        guest_count: Math.min(table.limit_seats, tablePurpose === 'head' ? headOrder.length : occupied.count),
        occupied_seat_numbers: (tablePurpose === 'head'
          ? headOrder.map((entry, index) => entry.seat_no ?? Math.floor((table.limit_seats - headOrder.length) / 2) + index + 1)
          : [...new Set(occupied.seats)])
          .filter((seat) => seat <= table.limit_seats)
          .sort((a, b) => a - b),
      } satisfies ReceptionTable;
    });
}

interface ReceptionSnapshot {tables: ReceptionTable[]; attendingCount: number}
const snapshots = new Map<string, {value:ReceptionSnapshot;loadedAt:number;eventId:string}>();
const reads = new Map<string, Promise<ReceptionSnapshot>>();
const snapshotKey = (eventId:string) => [getCacheGeneration(),getCacheUserId(),eventId].join('|');
registerCache(()=>{snapshots.clear();reads.clear();});
registerEventCache(eventId=>{for(const [key,value] of snapshots)if(value.eventId===eventId)snapshots.delete(key);});
function readReceptionTables(eventId:string) {
 const key=snapshotKey(eventId);const pending=reads.get(key);if(pending)return pending;
 const request=(async()=>{
  const [{data:tableRows,error:tablesError},{data:guestRows,error:guestsError}]=await Promise.all([
   supabase.from('tables').select('id, name, table_no, limit_seats, table_type, notes, table_purpose, head_seating_order').eq('event_id',eventId).order('table_no',{ascending:true}),
   supabase.from('guests').select('table_id, seat_no, rsvp').eq('event_id',eventId),
  ]);
  if(tablesError)throw tablesError;if(guestsError)throw guestsError;
  const value={tables:receptionTablesFromRecords(tableRows??[],guestRows??[]),attendingCount:(guestRows??[]).filter(guest=>normalizeRsvp(guest.rsvp)==='Attending').length};
  snapshots.set(key,{value,loadedAt:Date.now(),eventId});return value;
 })().finally(()=>{if(reads.get(key)===request)reads.delete(key);});
 reads.set(key,request);return request;
}
export const useReceptionTables = (eventId: string | null, activeView = true) => {
 const activeViewRef=useRef(activeView);activeViewRef.current=activeView;
 const wasActive=useRef(activeView);
 const refreshRef=useRef<(() => Promise<void>) | null>(null);
 const stateEvent=useRef(eventId);
 const cached=eventId?snapshots.get(snapshotKey(eventId)):undefined;
 const valid=cached && Date.now()-cached.loadedAt<5000 ? cached.value : null;
 const [snapshot,setSnapshot]=useState<ReceptionSnapshot|null>(valid);
 const [readyEventId,setReadyEventId]=useState<string|null>(valid?eventId:null);
 const [loading,setLoading]=useState(!!eventId&&!valid);
 const [error,setError]=useState<string|null>(null);
 const [retryVersion,setRetryVersion]=useState(0);
 useEffect(()=>{
  stateEvent.current=eventId;
  if(!eventId){setSnapshot(null);setReadyEventId(null);setLoading(false);setError(null);return;}
  const entry=snapshots.get(snapshotKey(eventId));
  const reuse=entry&&Date.now()-entry.loadedAt<5000?entry.value:null;
  setSnapshot(reuse);setReadyEventId(reuse?eventId:null);setLoading(!reuse);setError(null);
  let cancelled=false,active:Promise<void>|null=null,changed=false;
  const refresh=(showLoading=false,fromChange=false):Promise<void>=>{
   if(active){if(fromChange)changed=true;return active;}
   if(showLoading)setLoading(true);
   const request=(async()=>{
    try{const next=await readReceptionTables(eventId);if(!cancelled){setSnapshot(next);setReadyEventId(eventId);setError(null);}}
    catch(cause){if(!cancelled){console.error('useReceptionTables: failed to load tables',cause);setError('Could not load reception tables and guests. Please try again.');}}
    finally{active=null;if(!cancelled){setLoading(false);if(changed){changed=false;void refresh(false);}}}
   })();active=request;return request;
  };
  refreshRef.current=refresh;
  const change=()=>{snapshots.delete(snapshotKey(eventId));void refresh(false,true);};
  if(!reuse || retryVersion > 0)void refresh(!reuse);
  const channel=supabase.channel('reception-tables:'+eventId)
   .on('postgres_changes',{event:'*',schema:'public',table:'tables',filter:'event_id=eq.'+eventId},change)
   .on('postgres_changes',{event:'*',schema:'public',table:'guests',filter:'event_id=eq.'+eventId},change).subscribe();
  const pollId=window.setInterval(()=>{if(activeViewRef.current)void refresh();},5000);
  return()=>{cancelled=true;if(refreshRef.current===refresh)refreshRef.current=null;window.clearInterval(pollId);void supabase.removeChannel(channel);};
 },[eventId,retryVersion]);
 useEffect(()=>{
  if(activeView && !wasActive.current && eventId){const entry=snapshots.get(snapshotKey(eventId));if(!entry || Date.now()-entry.loadedAt>=5000)void refreshRef.current?.();}
  wasActive.current=activeView;
 },[activeView,eventId]);
 const visibleError=stateEvent.current===eventId?error:null;
 const ready=!!eventId&&readyEventId===eventId;
 return {tables:ready?snapshot?.tables??[]:[],attendingCount:ready?snapshot?.attendingCount??0:0,
  loading:!!eventId&&(!ready||loading)&&!visibleError,ready,error:visibleError,retry:()=>setRetryVersion(value=>value+1)};
};
