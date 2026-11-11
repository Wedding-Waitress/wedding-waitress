import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({read:vi.fn(),sign:vi.fn(),rpc:vi.fn(),toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:()=>{const query:any={select:()=>query,eq:()=>query,order:()=>api.read()};return query;},
 storage:{from:()=>({createSignedUrls:api.sign})},rpc:api.rpc,
}}));
import {VideoWishesManagement} from './VideoWishesManagement';
const wish={id:'wish',uploader_name:'Guest',uploaded_at:'2026-10-11T00:00:00Z',storage_path:'event/private.mp4',shared_to_gallery:false,shared_to_slideshow:false,moderation_status:'hidden'};
beforeEach(()=>{vi.clearAllMocks();api.read.mockResolvedValue({data:[],error:null});api.sign.mockResolvedValue({data:[{signedUrl:'https://example.com/private-signed'}],error:null});api.rpc.mockResolvedValue({data:[{item_id:'wish',identity_type:'guest_supplied'}],error:null});});
describe('Video Wishes manager request states',()=>{
 it('shows a successful empty state without sending empty signing requests',async()=>{
  render(<VideoWishesManagement eventId="empty"/>);
  expect(await screen.findByText('No Video Wishes yet.')).toBeInTheDocument();
  expect(api.sign).not.toHaveBeenCalled();expect(api.toast).not.toHaveBeenCalled();
 });
 it('keeps failed reads distinct from empty and Refresh recovers',async()=>{
  api.read.mockResolvedValueOnce({data:null,error:{code:'42501',message:'denied'}});
  render(<VideoWishesManagement eventId="event"/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load Video Wishes');
  expect(screen.queryByText('No Video Wishes yet.')).toBeNull();
  const notification=api.toast.mock.calls[0][0];expect(notification.variant).toBe('destructive');
  expect(notification.title).toBe('Could not load Video Wishes');expect(notification.className).toBe('[&_.text-success]:!text-white');
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  expect(await screen.findByText('No Video Wishes yet.')).toBeInTheDocument();
 });
 it('loads private records with signed URLs and unchanged sharing defaults',async()=>{
  api.read.mockResolvedValue({data:[wish],error:null});
  const {container}=render(<VideoWishesManagement eventId="event"/>);
  expect(await screen.findByText('Guest')).toBeInTheDocument();
  expect(container.querySelector('video')).toHaveAttribute('src','https://example.com/private-signed');
  expect(screen.getByText('Private — organiser and authorised managers only')).toBeInTheDocument();
  expect(api.sign).toHaveBeenCalledWith(['event/private.mp4'],3600);
  expect(api.rpc).toHaveBeenCalledWith('get_video_wishes_attribution',{_event_id:'event'});
 });
 it('treats a per-object signing failure as failure and retries successfully',async()=>{
  api.read.mockResolvedValue({data:[wish],error:null});
  api.sign.mockResolvedValueOnce({data:[{signedUrl:null,error:'not permitted'}],error:null});
  render(<VideoWishesManagement eventId="event"/>);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText('No Video Wishes yet.')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  expect(await screen.findByText('Guest')).toBeInTheDocument();
 });
 it('does not substitute an empty state for an attribution failure',async()=>{
  api.read.mockResolvedValue({data:[wish],error:null});api.rpc.mockResolvedValue({data:null,error:{message:'offline'}});
  render(<VideoWishesManagement eventId="event"/>);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText('No Video Wishes yet.')).toBeNull();
 });
 it('ignores a delayed result belonging to the previous event',async()=>{
  let resolve!:(value:any)=>void;api.read.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  const {rerender}=render(<VideoWishesManagement eventId="old"/>);
  rerender(<VideoWishesManagement eventId="new"/>);
  await screen.findByText('No Video Wishes yet.');
  await act(async()=>{resolve({data:[wish],error:null});});
  await waitFor(()=>expect(screen.queryByText('Guest')).toBeNull());
  expect(screen.getByText('No Video Wishes yet.')).toBeInTheDocument();
 });
});
