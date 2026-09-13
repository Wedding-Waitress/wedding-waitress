import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:new Proxy({},{get(){throw Error('Customer guest hooks forbidden');}})}));
import {AdminReadOnlyGuestRecords} from './AdminReadOnlyGuestRecords';
const guest={id:'guest',user_id:'owner',event_id:'event',first_name:'Élodie',last_name:'O’Connor',mobile:'0412345678',email:'fixture@example.test',notes:'Actual saved notes',rsvp:'yes',dietary:'Vegetarian',relation_display:'Friend',family_group:'Saved group',added_by_guest_id:null,rsvp_invite_status:'not_sent',table_no:2,seat_no:1,allow_plus_one:true};
describe('owned readonly saved guest fields',()=>{
 it('shows saved mailing fields and recorded received flag without enabling address collection',()=>{render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={[{...guest,address_received:true,mailing_address:'23 Saved Street',mailing_suburb:'Saved suburb',mailing_state:'VIC',mailing_postcode:'3000'}]}/>);expect(screen.getByText('23 Saved Street')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'Address Received'})).toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();});
 it('displays actual contact/RSVP/notes without send/edit/delete actions',()=>{
  render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={[guest]}/>);
  expect(screen.getByText('fixture@example.test')).toBeInTheDocument();expect(screen.getByText('Actual saved notes')).toBeInTheDocument();expect(screen.getByText('Attending')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 });
 it('resolves added-by names only from the same verified event source',()=>{
  render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={[guest,{...guest,id:'plusone',first_name:'Ava',added_by_guest_id:guest.id}]}/>);
  expect(screen.getByText('Élodie O’Connor')).toBeInTheDocument();
 });
 it('escapes saved notes and makes a missing RSVP explicitly unknown',()=>{
  const {container}=render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={[{...guest,notes:'<script>unsafe()</script>',rsvp:null}]}/>);
  expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument();expect(container.querySelector('script')).toBeNull();expect(screen.queryByText('Pending')).not.toBeInTheDocument();
 });
 it.each([undefined,[{...guest,user_id:'foreign'}],[{...guest,event_id:'other'}],[{...guest,email:42}],[guest,{...guest,first_name:'Different person'}]].map(guests=>({guests})))('blocks incomplete or foreign record sets (%j)',({guests})=>{
  render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={guests}/>);expect(screen.getByText(/No customer records have been substituted/)).toBeInTheDocument();
 });
 it('provides all records through bounded pages and local searching',()=>{
  const guests=Array.from({length:51},(_,index)=>({...guest,id:`guest-${index}`,first_name:`Guest${index}`}));
  render(<AdminReadOnlyGuestRecords ownerId="owner" eventId="event" guests={guests}/>);expect(screen.queryByText('Guest50')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next guest page'}));expect(screen.getByText('Guest50')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search saved guests'),{target:{value:'Guest25'}});expect(screen.getByText('Guest25')).toBeInTheDocument();expect(screen.queryByText('Guest50')).not.toBeInTheDocument();
 });
});
