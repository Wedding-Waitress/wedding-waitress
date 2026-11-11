import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {GuestUpdateModal} from './GuestUpdateModal';
const {rpc,toast,mobile}=vi.hoisted(()=>({rpc:vi.fn(),toast:vi.fn(),mobile:{value:false}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>mobile.value}));
const members=['Alex','Jamie','Robin'].map((first_name,i)=>({id:'guest-'+i,event_id:'event',first_name,last_name:'Morgan',family_group:'Morgan',rsvp:'Pending',email:first_name.toLowerCase()+'@example.test',notes:'Existing note '+first_name}));
const context=(id:string)=>({guest:members.find(g=>g.id===id),can_edit:true,can_rsvp:true,can_add:true,allow_name_edit:true,partner1_name:'Alex',partner2_name:'Jamie',relation_mode:'two',custom_roles:[],allow_custom:true});
beforeEach(()=>{rpc.mockReset();toast.mockReset();mobile.value=false;HTMLElement.prototype.scrollTo=vi.fn();rpc.mockImplementation(async(name,args)=>({data:name.startsWith('get_guest_details')?context(args._guest_id):true,error:null}));});
afterEach(cleanup);
const props=(count=3)=>({guest:members[0],event:{id:'event',collect_guest_addresses:true},allGuests:members.slice(0,count),enableGroupRsvp:true,editOnUpdate:true,open:true,onOpenChange:vi.fn(),onUpdate:vi.fn()});
for(const isMobile of [false,true])for(const count of [1,2,3])it(`opens ${count}-person ${isMobile?'mobile':'desktop'} flow without personal fields, then shows only the chosen record`,async()=>{
 mobile.value=isMobile;render(<GuestUpdateModal {...props(count)}/>);
 const intro=await screen.findByText('RSVP for your family / party');
 const group=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;
 expect(group).not.toContainElement(intro);expect(intro.compareDocumentPosition(group)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();expect(screen.queryByLabelText('Special Requests or Notes')).not.toBeInTheDocument();
 expect(group.querySelectorAll('[data-group-member-update]')).toHaveLength(0);
 const rows=group.querySelectorAll<HTMLElement>('[class*=partyMemberCard]');expect(rows).toHaveLength(count);
 for(const row of rows)expect(within(row).getAllByRole('button').map(n=>n.textContent)).toEqual(['Accept','Decline','Update']);
 expect(screen.getByRole('button',{name:'Save My Details'})).toBeInTheDocument();
 fireEvent.click(within(rows[count-1]).getByRole('button',{name:'Update'}));
 expect(await screen.findByLabelText('Email Address')).toHaveValue(members[count-1].email);
 expect(screen.getByLabelText('Special Requests or Notes')).toHaveValue(members[count-1].notes);
 expect(screen.getByLabelText('Mailing Address')).toBeInTheDocument();expect(screen.getByLabelText('Dietary Requirements')).toBeInTheDocument();
});
it('initial Save sends only explicitly chosen RSVPs and never hidden personal fields',async()=>{
 render(<GuestUpdateModal {...props()}/>);await screen.findByText('RSVP for your family / party');
 const rows=document.querySelectorAll<HTMLElement>('[class*=partyMemberCard]');
 fireEvent.click(within(rows[0]).getByRole('button',{name:'Decline'}));fireEvent.click(within(rows[1]).getByRole('button',{name:'Accept'}));
 fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));
 await waitFor(()=>expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(2));
 const saves=rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form');
 expect(saves.map(c=>c[1]._details)).toEqual([{rsvp:'Not Attending'},{rsvp:'Attending'}]);
});
it('initial Save without changes closes without submitting any hidden data',async()=>{
 const p=props(1);render(<GuestUpdateModal {...p} accessToken="fixture-token"/>);await screen.findByText('RSVP for your family / party');
 fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(p.onOpenChange).toHaveBeenCalledWith(false));
 expect(rpc.mock.calls.filter(c=>c[0].startsWith('save_'))).toHaveLength(0);
});
it('validates additional guests while details are hidden and sends no hidden defaults',async()=>{
 render(<GuestUpdateModal {...props()} accessToken="fixture-token"/>);fireEvent.click(await screen.findByRole('button',{name:'Add Additional Guest'}));
 fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'}));expect(rpc.mock.calls.filter(c=>c[0].startsWith('save_'))).toHaveLength(0);
 fireEvent.change(screen.getByLabelText('First Name *'),{target:{value:'Taylor'}});fireEvent.change(screen.getByLabelText('Last Name *'),{target:{value:'Morgan'}});
 fireEvent.click(screen.getByRole('button',{name:'Part of Our Group'}));fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form_authorized',expect.objectContaining({_details:{},_additional:[expect.objectContaining({first_name:'Taylor',last_name:'Morgan',group_choice:'group'})]})));
});
it('guards unsaved member edits and reopens with the editor hidden after explicit discard',async()=>{
 const p=props();const view=render(<GuestUpdateModal {...p} accessToken="fixture-token"/>);await screen.findByText('RSVP for your family / party');
 const update=(index:number)=>within(document.querySelectorAll<HTMLElement>('[class*=partyMemberCard]')[index]).getByRole('button',{name:'Update'});
 fireEvent.click(update(1));fireEvent.change(await screen.findByLabelText('Email Address'),{target:{value:'draft@example.test'}});
 fireEvent.click(update(0));fireEvent.click(await screen.findByRole('button',{name:'Keep Editing'}));expect(screen.getByLabelText('Email Address')).toHaveValue('draft@example.test');
 fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);fireEvent.click(await screen.findByRole('button',{name:'Discard Edits'}));
 view.rerender(<GuestUpdateModal {...p} open={false}/>);view.rerender(<GuestUpdateModal {...p} open/>);await screen.findByText('RSVP for your family / party');
 expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();expect(screen.queryByLabelText('Special Requests or Notes')).not.toBeInTheDocument();
});
