import React from 'react';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { GuestSongRequestsView } from './GuestSongRequestsSection';
import type { GuestSongRequestRow } from '@/hooks/useGuestSongRequests';
import { publicSongRequestViewRows, publicSongRequestViewSources } from '@/i18n/publicSongRequestViewCopy';
const api=vi.hoisted(()=>({status:vi.fn(),remove:vi.fn(),pdf:vi.fn()}));
vi.mock('@/lib/guestSongRequestsPdfExporter',()=>({exportGuestSongRequestsToPDF:api.pdf}));
const row=(id:string,guest_id:string,guest_name:string,status:GuestSongRequestRow['status']):GuestSongRequestRow=>({id,guest_id,guest_name,status,event_id:'event',slot_index:0,song_title:id,artist_name:'Artist',music_link:null,note:null,created_at:'2026-10-28T01:00:00Z',updated_at:'2026-10-28T01:00:00Z'});
const rows=[row('John song A','john','John Smith','pending'),row('John song B','john','John Smith','approved'),row('Amy song','amy','Amy Jones','rejected'),row('Other John song','other-john','John Smith','pending')];
const props={rows,settings:{id:'settings',event_id:'event',enabled:true,max_requests_per_guest:10},loading:false,updateStatus:api.status,deleteRequest:api.remove,eventName:'Wedding'};
const choose=async(label:string)=>{fireEvent.keyDown(screen.getByRole('combobox',{name:'View by'}),{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:label}));};
beforeEach(()=>{Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable:true, value:vi.fn() });vi.clearAllMocks();api.pdf.mockResolvedValue(undefined);});afterEach(cleanup);
describe('compact guest song request views',()=>{
 it('defaults to all requests with the selector immediately before the PDF action',()=>{
  render(<GuestSongRequestsView {...props}/>);expect(screen.getByText('John song A')).toBeVisible();expect(screen.getByText('Amy song')).toBeVisible();
  const view=screen.getByRole('combobox',{name:'View by'});expect(view).toHaveTextContent('All requests');expect(view.compareDocumentPosition(screen.getByRole('button',{name:'Download PDF'}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 });
 it.each([['Pending',['John song A','Other John song']],['Approved',['John song B']],['Rejected',['Amy song']]] as const)('filters %s while preserving full totals',async(label,visible)=>{
  render(<GuestSongRequestsView {...props}/>);await choose(label);for(const request of rows)expect(Boolean(screen.queryByText(request.song_title))).toBe(visible.includes(request.song_title as never));expect(screen.getByText('Total 4')).toBeInTheDocument();
 });
 it('groups by guest identity, gives counts, sorts names and starts compact',async()=>{
  const {container}=render(<GuestSongRequestsView {...props}/>);await choose('Guest name');const groups=[...container.querySelectorAll('details')];expect(groups).toHaveLength(3);expect(groups[0].querySelector('summary')).toHaveTextContent('Amy Jones');expect(groups.every(group=>!group.open)).toBe(true);
  const john=groups.find(group=>group.querySelector('summary')?.textContent?.includes('Songs: 2'))!;expect(john.querySelector('summary')).toHaveTextContent('John Smith');expect(within(john).getByText('John song A')).not.toBeVisible();fireEvent.click(john.querySelector('summary')!);expect(within(john).getByText('John song A')).toBeVisible();expect(within(john).queryByText('Other John song')).not.toBeInTheDocument();
 });
 it('retains status callbacks and responds when saved statuses change',async()=>{
  const view=render(<GuestSongRequestsView {...props}/>);await choose('Pending');fireEvent.keyDown(screen.getByRole('combobox',{name:'Request status: John song A'}),{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'Approved'}));expect(api.status).toHaveBeenCalledWith('John song A','approved');
  view.rerender(<GuestSongRequestsView {...props} rows={rows.map(request=>request.id==='John song A'?{...request,status:'approved'}:request)}/>);expect(screen.queryByText('John song A')).not.toBeInTheDocument();
 });
 it('shows an empty filtered result and allows returning to the full list',async()=>{
  render(<GuestSongRequestsView {...props} rows={[rows[0]]}/>);await choose('Rejected');expect(screen.getByRole('status')).toHaveTextContent('No requests in this view.');await choose('All requests');expect(screen.getByText('John song A')).toBeVisible();
 });
 it('keeps read-only request actions disabled while view selection remains usable',async()=>{
  render(<GuestSongRequestsView {...props} disabled/>);expect(screen.getByRole('combobox',{name:'View by'})).toBeEnabled();expect(screen.getByRole('combobox',{name:'Request status: John song A'})).toBeDisabled();expect(screen.getAllByRole('button',{name:'Delete song request'}).every(button=>(button as HTMLButtonElement).disabled)).toBe(true);await choose('Guest name');expect(screen.getByText(/Requested by your guest Amy Jones/)).toBeInTheDocument();
 });
 it('keeps PDF export as the complete saved request list',async()=>{
  render(<GuestSongRequestsView {...props}/>);await choose('Approved');fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));await waitFor(()=>expect(api.pdf).toHaveBeenCalledWith(expect.objectContaining({rows,eventName:'Wedding'})));
 });
 it('provides every new label in all thirteen languages',()=>{
  expect(Object.keys(publicSongRequestViewRows)).toHaveLength(13);expect(publicSongRequestViewRows.en).toEqual(publicSongRequestViewSources);for(const values of Object.values(publicSongRequestViewRows)){expect(values).toHaveLength(publicSongRequestViewSources.length);expect(values.every(value=>value.trim())).toBe(true);}
 });
});


