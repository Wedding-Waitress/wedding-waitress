import type {PhotoEvent} from '@/types/photoCallout';
export function photoEventDate(value?:string|null){if(!value)return 'Date to be confirmed';const d=new Date(value+'T12:00:00');const day=d.getDate();const suffix=day>10&&day<14?'th':day%10===1?'st':day%10===2?'nd':day%10===3?'rd':'th';return `${d.toLocaleDateString('en-AU',{weekday:'long'})}, ${day}${suffix} ${d.toLocaleDateString('en-AU',{month:'long',year:'numeric'})}`;}
export function photoEventTime(value?:string|null){if(!value)return '';const [hours,minutes]=value.split(':');const h=Number(hours);return `${h%12||12}:${minutes} ${h>=12?'PM':'AM'}`;}
export function photoEventDetails(event:PhotoEvent){const lines:string[]=[];const line=(label:string,date?:string|null,venue?:string|null,start?:string|null,end?:string|null)=>`${label}: ${[photoEventDate(date),venue,[photoEventTime(start),photoEventTime(end)].filter(Boolean).join(' – ')].filter(Boolean).join(' | ')}`;
 if(event.ceremony_enabled)lines.push(line('Ceremony',event.ceremony_date,event.ceremony_venue,event.ceremony_start_time,event.ceremony_finish_time));
 if(event.reception_enabled!==false)lines.push(line('Reception',event.date,event.venue,event.start_time,event.finish_time));
 return lines.length?lines:[line('Event',event.date,event.venue,event.start_time,event.finish_time)];
}
