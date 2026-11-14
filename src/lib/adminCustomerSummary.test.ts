import {describe,it,expect} from 'vitest';
import {getAdminCustomerSummary,sydneyCalendarDate} from './adminCustomerSummary';
const now=new Date('2026-10-31T04:00:00Z');
describe('customer account and event summary',()=>{
 it('counts unique signups, including the owner and unverified missing profiles, while excluding orphan profiles',()=>{
  const customers=[{id:'owner',auth_record_exists:true},{id:'customer',auth_record_exists:true},{id:'customer',auth_record_exists:true},{id:'unverified',auth_record_exists:true,identity_state:'missing_profile'},{id:'orphan',auth_record_exists:false},{id:'orphan-legacy',identity_state:'missing_auth'}];
  expect(getAdminCustomerSummary({customers,events:[]},now).signups).toBe(3);
 });
 it('counts only saved events, partitions undated/today/future/past, and ignores plan or legacy event status',()=>{
  const events=[{id:'undated',effective_date:null,guest_count:2,event_status:'active'},{id:'today',effective_date:'2026-10-31',guest_count:3,event_status:'completed'},{id:'future',effective_date:'2027-03-31',guest_count:5,event_status:'active'},{id:'past',effective_date:'2026-10-30',guest_count:7,event_status:'upcoming'}];
  expect(getAdminCustomerSummary({customers:[{id:'draft-only'}],events},now)).toEqual({signups:1,events:4,awaitingDate:1,upcoming:2,past:1,guests:17});
 });
 it('counts five events with 100 saved guest records each as 500 and ignores planning estimates',()=>{
  const events=Array.from({length:5},(_,index)=>({id:String(index),effective_date:null,guest_count:100,setup_details:{expectedAttending:999}}));
  expect(getAdminCustomerSummary({customers:[],events},now).guests).toBe(500);
 });
 it.each([
  ['2026-10-30T12:59:59Z','2026-10-30',1,0],
  ['2026-10-30T13:00:00Z','2026-10-31',0,1],
  ['2026-06-30T13:59:59Z','2026-06-30',1,0],
  ['2026-06-30T14:00:00Z','2026-07-01',0,1],
 ])('uses Sydney midnight rather than UTC midnight at %s',(instant,today,upcoming,past)=>{
  const date=new Date(instant),eventDate=instant.startsWith('2026-10')?'2026-10-30':'2026-06-30';
  expect(sydneyCalendarDate(date)).toBe(today);
  const result=getAdminCustomerSummary({customers:[],events:[{id:'event',effective_date:eventDate,guest_count:0}]},date);
  expect(result.upcoming).toBe(upcoming);expect(result.past).toBe(past);
 });
 it('handles a zero state without averages or NaN',()=>{
  expect(getAdminCustomerSummary({customers:[],events:[]},now)).toEqual({signups:0,events:0,awaitingDate:0,upcoming:0,past:0,guests:0});
 });
});
