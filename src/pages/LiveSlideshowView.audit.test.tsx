import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const api=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('react-router-dom',()=>({useParams:()=>({eventSlug:'test'})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:api.rpc,channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:vi.fn()}}));
import {LiveSlideshowView} from './LiveSlideshowView';
const row={event_id:'event',event_name:'Test Wedding',event_date:'2027-09-05',guest_id:'one',guest_first_name:'Amelia',guest_last_name:null,guest_table_no:1,guest_seat_no:2,guest_rsvp:'Pending',guest_dietary:' N/A ',kiosk_show_rsvp_status:true,kiosk_show_dietary:true};
beforeEach(()=>{api.rpc.mockReset();api.rpc.mockResolvedValue({data:[row],error:null});});
describe('Live Slideshow guest behaviour',()=>{
 it('searches trimmed names with missing surnames, clears, and handles no matches',async()=>{
  render(<LiveSlideshowView/>);const input=await screen.findByRole('textbox',{name:'Search guest names'});
  fireEvent.change(input,{target:{value:'  AMELIA  '}});
  expect(screen.getByText('Table 1')).toBeInTheDocument();expect(screen.queryByText('Dietary Requirements:')).toBeNull();
  fireEvent.click(screen.getByText('Clear Search'));expect(input).toHaveValue('');
  fireEvent.change(input,{target:{value:'Nobody'}});expect(screen.getByText('No guests found')).toBeInTheDocument();
 });
 it('refreshes display preferences without clearing a search',async()=>{
  render(<LiveSlideshowView/>);const input=await screen.findByRole('textbox',{name:'Search guest names'});fireEvent.change(input,{target:{value:'Amelia'}});
  expect(screen.getByText('RSVP Status:')).toBeInTheDocument();
  api.rpc.mockResolvedValue({data:[{...row,kiosk_show_rsvp_status:false}],error:null});fireEvent(window,new Event('focus'));
  await waitFor(()=>expect(screen.queryByText('RSVP Status:')).toBeNull());expect(input).toHaveValue('Amelia');
 });
 it('handles fullscreen rejection and event fetch failure visibly',async()=>{
  api.rpc.mockResolvedValue({data:null,error:{message:'offline'}});render(<LiveSlideshowView/>);
  expect(await screen.findByText('Unable to load event')).toBeInTheDocument();
  api.rpc.mockResolvedValue({data:[row],error:null});fireEvent.click(screen.getByText('Retry'));
  const button=await screen.findByText('Enter / Exit Fullscreen');
  Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:vi.fn().mockRejectedValue(new Error('denied'))});
  fireEvent.click(button);expect(await screen.findByText(/Fullscreen is unavailable/)).toBeInTheDocument();
 });
});

describe('Live Slideshow authoritative named seating',()=>{
 it('resolves a named table without a numeric table number and preserves seat 9',async()=>{
  api.rpc.mockImplementation(async(name,args)=>name==='get_public_table_data'?{data:[{table_id:'named-table',table_name:'1. Brides Family',table_no:null}],error:null}:{data:[{...row,guest_table_id:'named-table',guest_table_no:null,guest_seat_no:9}],error:null});
  render(<LiveSlideshowView/>);const input=await screen.findByRole('textbox',{name:'Search guest names'});fireEvent.change(input,{target:{value:'Amelia'}});
  expect(screen.getByText('1. Brides Family')).toBeInTheDocument();expect(screen.getByText('Seat 9')).toBeInTheDocument();expect(screen.queryByText('Table assignment pending')).toBeNull();
  expect(api.rpc).toHaveBeenCalledWith('get_public_table_data',{p_event_id:'event',p_table_id:'named-table'});
 });
 it('shows pending for a genuinely unassigned guest, then reflects a saved assignment on refresh',async()=>{
  api.rpc.mockResolvedValue({data:[{...row,guest_table_no:null,guest_table_id:null,guest_seat_no:null}],error:null});
  render(<LiveSlideshowView/>);const input=await screen.findByRole('textbox',{name:'Search guest names'});fireEvent.change(input,{target:{value:'Amelia'}});expect(screen.getByText('Table assignment pending')).toBeInTheDocument();
  api.rpc.mockResolvedValue({data:[row],error:null});fireEvent(window,new Event('focus'));await waitFor(()=>expect(screen.getByText('Table 1')).toBeInTheDocument());expect(screen.queryByText('Table assignment pending')).toBeNull();
 });
});

it('normalizes spaces in saved names and full-name searches',async()=>{api.rpc.mockResolvedValue({data:[{...row,guest_first_name:'  Amelia  ',guest_last_name:'  Van   Reed  '}],error:null});render(<LiveSlideshowView/>);const input=await screen.findByRole('textbox',{name:'Search guest names'});fireEvent.change(input,{target:{value:' Amelia   Van Reed '}});expect(screen.getByText('Table 1')).toBeInTheDocument();expect(screen.queryByText('No guests found')).toBeNull();});
