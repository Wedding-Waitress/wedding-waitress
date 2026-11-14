import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const api=vi.hoisted(()=>({rpc:vi.fn(),toast:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:api.rpc}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{language:'en'}})}));
import { GuestSongRequestsModal } from './GuestSongRequestsModal';
beforeEach(()=>{vi.clearAllMocks();api.rpc.mockResolvedValue({data:[],error:null});});afterEach(cleanup);
const mount=(props:any={})=>render(<GuestSongRequestsModal open onOpenChange={vi.fn()} guestId="guest" eventId="event" maxRequests={10} {...props}/>);
describe('standalone name-selected song form',()=>{
 it('loads ten slots and restores sparse saved requests to their correct positions',async()=>{
  api.rpc.mockResolvedValue({data:[{slot_index:3,song_title:'Existing song',artist_name:'Artist'}],error:null});mount();
  const titles=await screen.findAllByLabelText('Song Title');expect(titles).toHaveLength(10);expect(titles[3]).toHaveValue('Existing song');expect(titles[0]).toHaveValue('');
  expect(api.rpc).toHaveBeenCalledWith('get_guest_song_requests_for_guest',{_event_id:'event',_guest_id:'guest'});
 });
 it('saves only the chosen guest and event with at most ten numbered slots',async()=>{
  mount();const titles=await screen.findAllByLabelText('Song Title');fireEvent.change(titles[0],{target:{value:' New song '}});api.rpc.mockResolvedValue({data:true,error:null});
  fireEvent.click(screen.getByRole('button',{name:'Save Song Requests'}));
  await waitFor(()=>expect(api.rpc).toHaveBeenCalledWith('submit_guest_song_requests',expect.objectContaining({_event_id:'event',_guest_id:'guest',_requests:expect.any(Array)})));
  const saved=api.rpc.mock.calls.find(([name])=>name==='submit_guest_song_requests')![1];expect(saved._requests).toHaveLength(10);expect(saved._requests[0]).toMatchObject({slot_index:0,song_title:'New song'});expect(saved).not.toHaveProperty('_access_token');
 });
 it('honours a smaller organiser limit',async()=>{mount({maxRequests:2});expect(await screen.findAllByLabelText('Song Title')).toHaveLength(2);});
 it('blocks saving when existing requests cannot be loaded',async()=>{
  api.rpc.mockResolvedValue({data:null,error:{message:'Unavailable'}});mount();expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load song requests');expect(screen.getByRole('button',{name:'Save Song Requests'})).toBeDisabled();
 });
 it('retains personal-link support',async()=>{
  mount({accessToken:'personal'});await screen.findAllByLabelText('Song Title');expect(api.rpc).toHaveBeenCalledWith('get_guest_invitation_song_requests',{_access_token:'personal',_guest_id:'guest'});
 });
 it('does not display or save a previous guest’s songs after changing guests',async()=>{
  api.rpc.mockResolvedValueOnce({data:[{slot_index:0,song_title:'First guest song'}],error:null});const view=mount();expect((await screen.findAllByLabelText('Song Title'))[0]).toHaveValue('First guest song');
  api.rpc.mockResolvedValue({data:null,error:{message:'Unavailable'}});view.rerender(<GuestSongRequestsModal open onOpenChange={vi.fn()} eventId="event" guestId="second" maxRequests={10}/>);
  expect(await screen.findByRole('alert')).toBeInTheDocument();expect(screen.queryByDisplayValue('First guest song')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Save Song Requests'})).toBeDisabled();
 });
});
