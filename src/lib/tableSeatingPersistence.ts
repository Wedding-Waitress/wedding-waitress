import {persistHeadMovePlan,readSnapshot} from './headTableMovePersistence';
import {planMissingTableSeats,planTableMove,planTableReorder} from './tableSeatingPlan';
import type {HeadMove} from './headTableMoves';
const queues=new Map<string,Promise<void>>();
export const isTableSeatingBusy=(eventId:string)=>queues.has(eventId);
/** A fresh snapshot per operation, serialized for the whole selected event. */
export function queueTableSeating<T>(eventId:string,task:()=>Promise<T>):Promise<T>{
  const previous=queues.get(eventId)??Promise.resolve();
  const request=previous.catch(()=>{}).then(task);
  const tail=request.then(()=>{},()=>{});queues.set(eventId,tail);
  void tail.then(()=>{if(queues.get(eventId)===tail)queues.delete(eventId);});
  return request;
}
export function saveTableSeating(eventId:string,action:HeadMove|{tableId:string;orderedGuestIds:string[]},isCurrent=()=>true):Promise<boolean>{
  return queueTableSeating(eventId,async()=>{
    if(!isCurrent())return false;
    const snapshot=await readSnapshot(eventId);
    if(!isCurrent())return false;
    const plan='guestId' in action?planTableMove(snapshot,action):planTableReorder(snapshot,action.tableId,action.orderedGuestIds);
    if(!plan||!plan.guests.length&&!plan.heads.length)return false;
    await persistHeadMovePlan(plan);return true;
  });
}
export function repairMissingTableSeats(eventId:string,isCurrent=()=>true,displayedGuestIds:string[]=[]):Promise<boolean>{
  return queueTableSeating(eventId,async()=>{
    if(!isCurrent())return false;
    const snapshot=await readSnapshot(eventId);
    if(!isCurrent())return false;
    const plan=planMissingTableSeats(snapshot,displayedGuestIds);
    if(!plan.guests.length)return false;
    await persistHeadMovePlan(plan);return true;
  });
}
