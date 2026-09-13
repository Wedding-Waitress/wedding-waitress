import {formatDisplayDate,formatDisplayTime} from '@/lib/utils';
export const SIGNAGE_PRINT_DIMENSIONS:Record<string,{widthMm:number;heightMm:number}>={
 a0:{widthMm:841,heightMm:1189},a1:{widthMm:594,heightMm:841},a2:{widthMm:420,heightMm:594},a3:{widthMm:297,heightMm:420},
};
export interface SignageEventDataSource {name?:string|null;date?:string|null;venue?:string|null;start_time?:string|null;partner1_name?:string|null;partner2_name?:string|null;}
/** Shared saved-event interpretation; no customer hooks, writes or sample data. */
export function signageEventDataFromEvent(event:SignageEventDataSource|null|undefined):Record<string,string>{
 if(!event)return {};
 const p1=event.partner1_name||'',p2=event.partner2_name||'';
 const coupleNames=p1&&p2?`${p1} & ${p2}`:p1||p2||event.name;
 return {
  couple_names:coupleNames||'',event_name:event.name||'',
  date:event.date?(()=>{const [y,m,d]=event.date.split('-').map(Number);const dt=new Date(y,(m||1)-1,d||1);
   return isNaN(dt.getTime())?formatDisplayDate(event.date):dt.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});})():'',
  date_raw:event.date||'',venue:event.venue||'',time:event.start_time?formatDisplayTime(event.start_time):'',
  welcome_message:'Please scan the QR code to find your table.',qr_instructions:'Scan to find your seat',
 };
}
