export interface CustomerCountdownEvent {date:string|null;start_time:string|null;finish_time:string|null;}
export type CustomerCountdownState='upcoming'|'in_progress'|'finished'|'no_event';
export interface CustomerCountdownResult {months:number;weeks:number;hours:number;seconds:number;eventState:CustomerCountdownState;targetEnd:Date|null;}
// Deliberately preserves the existing customer browser-local date/time and
// approximate 30-day month calculation. Not a new timezone or billing rule.
export function calculateCustomerTimeRemaining(event:CustomerCountdownEvent|null,now=new Date()):CustomerCountdownResult {
 if(!event?.date)return {months:0,weeks:0,hours:0,seconds:0,eventState:'no_event',targetEnd:null};
 const eventDate=new Date(event.date),targetStart=new Date(eventDate);
 if(event.start_time){const [hours,minutes]=event.start_time.split(':');targetStart.setHours(parseInt(hours),parseInt(minutes),0,0);}else targetStart.setHours(0,0,0,0);
 let targetEnd:Date|null=null;
 if(event.finish_time){targetEnd=new Date(eventDate);const [endHours,endMinutes]=event.finish_time.split(':'),endHour=parseInt(endHours),endMinute=parseInt(endMinutes);
  const startHour=event.start_time?parseInt(event.start_time.split(':')[0]):0,startMinute=event.start_time?parseInt(event.start_time.split(':')[1]):0;
  if(endHour<startHour||endHour===startHour&&endMinute<=startMinute)targetEnd.setDate(targetEnd.getDate()+1);targetEnd.setHours(endHour,endMinute,0,0);
 }
 let targetTime:Date,eventState:CustomerCountdownState;
 if(now<targetStart){targetTime=targetStart;eventState='upcoming';}else if(targetEnd&&now<targetEnd){targetTime=targetEnd;eventState='in_progress';}
 else return {months:0,weeks:0,hours:0,seconds:0,eventState:'finished',targetEnd};
 const timeDiff=targetTime.getTime()-now.getTime();if(timeDiff<=0)return {months:0,weeks:0,hours:0,seconds:0,eventState:'finished',targetEnd};
 const totalSeconds=Math.floor(timeDiff/1000),totalMinutes=Math.floor(totalSeconds/60),totalHours=Math.floor(totalMinutes/60),totalDays=Math.floor(totalHours/24),months=Math.floor(totalDays/30);
 return {months,weeks:Math.floor((totalDays-months*30)/7),hours:totalHours-totalDays*24,seconds:totalSeconds%60,eventState,targetEnd};
}
export function customerCountdownProgress(type:string,now=new Date()){
 switch(type){case 'months':return now.getDate()/new Date(now.getFullYear(),now.getMonth()+1,0).getDate()*100;
 case 'weeks':return now.getDay()/7*100;case 'hours':return (now.getMinutes()*60+now.getSeconds())/3600*100;case 'seconds':return now.getSeconds()/60*100;default:return 0;}
}
