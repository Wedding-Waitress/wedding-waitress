import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {GuestSongRequestRow} from '@/hooks/useGuestSongRequests';
import {AdminReadOnlyGuestSongRequests} from './AdminReadOnlyGuestSongRequests';
const mocks=vi.hoisted(()=>({rowsHook:vi.fn(),settingsHook:vi.fn(),pdf:vi.fn()}));
vi.mock('@/hooks/useGuestSongRequests',()=>({useGuestSongRequests:mocks.rowsHook}));
vi.mock('@/hooks/useGuestSongRequestSettings',()=>({useGuestSongRequestSettings:mocks.settingsHook}));
vi.mock('@/lib/guestSongRequestsPdfExporter',()=>({exportGuestSongRequestsToPDF:mocks.pdf}));
const row={id:'request',event_id:'event',guest_id:'guest',guest_name:"Élodie O’Connor",slot_index:1,song_title:'Wedding song',artist_name:'Artist',music_link:'https://example.test/music',note:'Saved request note',status:'pending',created_at:'2026-09-12T01:00:00Z',updated_at:'2026-09-12T01:00:00Z'} satisfies GuestSongRequestRow;
describe('read-only saved Guest Song Requests',()=>{
 beforeEach(()=>{mocks.rowsHook.mockReset();mocks.settingsHook.mockReset();mocks.pdf.mockReset().mockResolvedValue(undefined);});
 it('shows actual saved request fields with writes disabled and without mounting organizer hooks',async()=>{
  render(<AdminReadOnlyGuestSongRequests rows={[row]} settings={{id:'settings',event_id:'event',enabled:true,max_requests_per_guest:2}} eventName='Saved wedding' eventDate='2027-09-05'/>);
  expect(screen.getByText(row.guest_name)).toBeInTheDocument();expect(screen.getByText(row.song_title)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:row.music_link!})).toHaveAttribute('href',row.music_link);
  expect(screen.getByRole('button',{name:'Delete song request'})).toBeDisabled();
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(mocks.rowsHook).not.toHaveBeenCalled();expect(mocks.settingsHook).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(mocks.pdf).toHaveBeenCalled());
  expect(mocks.pdf.mock.lastCall![0]).toMatchObject({rows:[row],eventName:'Saved wedding',eventDate:'2027-09-05'});
 });
 it('keeps an empty saved request collection empty',()=>{
  render(<AdminReadOnlyGuestSongRequests rows={[]} settings={null} eventName='Event' eventDate={null}/>);
  expect(screen.getByRole('button',{name:'Download PDF'})).toBeDisabled();
  expect(mocks.rowsHook).not.toHaveBeenCalled();expect(mocks.settingsHook).not.toHaveBeenCalled();
 });
});
