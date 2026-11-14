import type {PhotoCard,PhotoPlan} from '@/types/photoCallout';
export interface PhotoDeletion {eventId:string;before:PhotoCard[];notes:Record<string,string>;deletedIds:string[]}
export function capturePhotoDeletion(plan:PhotoPlan,deletedIds:string[]):PhotoDeletion {
 return {eventId:plan.event_id,before:structuredClone(plan.cards),notes:{...plan.private_notes},deletedIds:[...deletedIds]};
}
export function restorePhotoDeletion(plan:PhotoPlan,deletion:PhotoDeletion):{cards:PhotoCard[];notes:Record<string,string>} {
 if(plan.event_id!==deletion.eventId)throw new Error('Select the original event to undo this deletion.');
 const cards=[...plan.cards];const notes={...plan.private_notes};const deleted=new Set(deletion.deletedIds);
 // Insert before the next surviving original card, preserving later edits and new cards.
 for(let i=deletion.before.length-1;i>=0;i--){const card=deletion.before[i];if(!deleted.has(card.id)||cards.some(c=>c.id===card.id)||(card.everyone&&cards.some(c=>c.everyone)))continue;
  const next=deletion.before.slice(i+1).find(c=>cards.some(current=>current.id===c.id));const index=next?cards.findIndex(c=>c.id===next.id):cards.length;
  cards.splice(index,0,structuredClone(card));if(deletion.notes[card.id]!==undefined)notes[card.id]=deletion.notes[card.id];
 }
 // The optional all-guests card must remain first even if new groups were added meanwhile.
 cards.sort((a,b)=>Number(!!b.everyone)-Number(!!a.everyone));
 if(cards.length>200)throw new Error('Restoring these cards would exceed the 200 group limit.');
 return {cards,notes};
}
