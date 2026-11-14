import React from 'react';
import {HeartHandshake,PartyPopper,CalendarDays,Clock3,MapPin} from 'lucide-react';
import type {PhotoEvent} from '@/types/photoCallout';
import {photoEventDate,photoEventTime} from '@/lib/photoCalloutEventDetails';
import theme from '../RunningSheet/RunningSheetTheme.module.css';
export function PhotoEventBanner({event,className=""}:{event:PhotoEvent;className?:string}){
 const parts=[...(event.ceremony_enabled?[{label:'Ceremony',Icon:HeartHandshake,date:event.ceremony_date,start:event.ceremony_start_time,finish:event.ceremony_finish_time,venue:event.ceremony_venue}]:[]),...(event.reception_enabled!==false?[{label:'Reception',Icon:PartyPopper,date:event.date,start:event.start_time,finish:event.finish_time,venue:event.venue}]:[])];
 return <div className={`text-center py-4 px-4 space-y-3 ${theme.eventBanner} ${className}`}><h2 className="text-xl font-semibold text-primary">{event.name}</h2><div className={`flex justify-center gap-8 flex-wrap ${parts.length===1?'max-w-md mx-auto':''}`}>
 {parts.map(({label,Icon,date,start,finish,venue})=><div className="text-left min-w-[280px]" key={label}><div className="flex items-center gap-1.5 flex-wrap"><Icon size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true"/><span className={`font-semibold text-primary ${theme.eventDetailLabel}`}>{label}:</span><CalendarDays size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" aria-hidden="true"/><span className={`text-muted-foreground ${theme.eventDetailText}`}>{photoEventDate(date)}</span></div><div className={`text-muted-foreground mt-1 flex items-center gap-1.5 ${theme.eventDetailText}`}><Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true"/><span>Start: {photoEventTime(start)||'TBD'} — Finish: {photoEventTime(finish)||'TBD'}</span></div>{venue&&<div className={`text-muted-foreground flex items-center gap-1.5 ${theme.eventDetailText}`}><MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true"/><span>{venue}</span></div>}</div>)}
 </div></div>;
}
