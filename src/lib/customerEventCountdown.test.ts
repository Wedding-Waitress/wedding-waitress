import {describe,it,expect} from 'vitest';
import {calculateCustomerTimeRemaining,customerCountdownProgress} from './customerEventCountdown';
const event={date:'2026-09-12',start_time:'13:18:00',finish_time:'23:00:00'};
const at=(date:string,hours:number,minutes=0,seconds=0)=>{const result=new Date(date);result.setHours(hours,minutes,seconds,0);return result;};
describe('preserved customer event countdown calculation',()=>{
 it('preserves missing-date no-event state',()=>expect(calculateCustomerTimeRemaining(null)).toEqual({months:0,weeks:0,hours:0,seconds:0,eventState:'no_event',targetEnd:null}));
 it('counts toward the customer local start and then finish without a timezone rewrite',()=>{
  expect(calculateCustomerTimeRemaining(event,at(event.date,12,18,15))).toMatchObject({months:0,weeks:0,hours:0,seconds:45,eventState:'upcoming'});
  expect(calculateCustomerTimeRemaining(event,at(event.date,14))).toMatchObject({hours:9,seconds:0,eventState:'in_progress'});
  expect(calculateCustomerTimeRemaining(event,at(event.date,23))).toMatchObject({hours:0,eventState:'finished'});
 });
 it('preserves overnight end times, including equal start/finish',()=>{
  for(const finish_time of ['01:00:00','13:18:00']){const result=calculateCustomerTimeRemaining({...event,finish_time},at(event.date,23));expect(result.eventState).toBe('in_progress');expect(result.targetEnd?.getDate()).toBe(at(event.date,23).getDate()+1);}
 });
 it('preserves absent-start midnight and absent-end finished behavior',()=>{
  expect(calculateCustomerTimeRemaining({...event,start_time:null},at(event.date,0,0,1)).eventState).toBe('in_progress');
  expect(calculateCustomerTimeRemaining({...event,finish_time:null},at(event.date,13,18)).eventState).toBe('finished');
 });
 it('preserves approximate month/week/hour/second decomposition',()=>{
  const target=at(event.date,13,18),now=new Date(target.getTime()-(37*24*3600+2*3600+19)*1000);
  expect(calculateCustomerTimeRemaining(event,now)).toMatchObject({months:1,weeks:1,hours:2,seconds:19,eventState:'upcoming'});
 });
 it('preserves four customer ring progress calculations',()=>{
  const now=at(event.date,13,30,15);expect(customerCountdownProgress('seconds',now)).toBe(25);expect(customerCountdownProgress('hours',now)).toBe(1815/3600*100);expect(customerCountdownProgress('weeks',now)).toBe(now.getDay()/7*100);
  expect(customerCountdownProgress('months',now)).toBe(now.getDate()/new Date(now.getFullYear(),now.getMonth()+1,0).getDate()*100);expect(customerCountdownProgress('other',now)).toBe(0);
 });
});
