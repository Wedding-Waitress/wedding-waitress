import React from 'react';
import { render,screen,fireEvent,waitFor,cleanup,within } from '@testing-library/react';
import { afterEach,beforeEach,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GuestUpdateModal } from './GuestUpdateModal';
const {rpc,toast,mobile}=vi.hoisted(()=>({rpc:vi.fn(),toast:vi.fn(),mobile:{value:false}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>mobile.value}));
const guest={id:'sophie',event_id:'event',first_name:'Sophie',last_name:'Bennett',rsvp:'Attending',family_group:'Bennett Couple'};
const context={guest:{...guest,table_no:2,seat_no:5,relation_partner:'partner_one',relation_role:'guest',email:'sophie@example.test'},can_edit:true,can_rsvp:true,can_add:true,allow_name_edit:false,partner1_name:'Wendy',partner2_name:'Tom',relation_mode:'two',custom_roles:[],allow_custom:true};
afterEach(cleanup);
beforeEach(()=>{Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});mobile.value=false;rpc.mockReset();toast.mockReset();rpc.mockImplementation(async(name)=>({data:name==='get_guest_details_form'||name==='get_guest_details_form_authorized'?context:true,error:null}));});
function partyCard(name:string){return screen.getAllByText(name).map(n=>n.closest<HTMLElement>('[class*="partyMemberCard"]')).find(Boolean)!;}
function mount(overrides:any={}){return render(<GuestUpdateModal guest={guest} event={{id:'event'}} open onOpenChange={()=>{}} onUpdate={()=>{}} allGuests={[guest,{id:'james',first_name:'James',last_name:'Bennett',family_group:'Bennett Couple'}]} {...overrides}/>);}
it('saves only changed invited party RSVP choices and excludes unrelated guests',async()=>{
  const james={id:'james',event_id:'event',first_name:'James',last_name:'Bennett',rsvp:'Pending',family_group:'Bennett Couple'};
  const unrelated={id:'other',event_id:'event',first_name:'Other',last_name:'Guest',rsvp:'Pending',family_group:'Other Family'};
  mount({enableGroupRsvp:true,allGuests:[guest,james,unrelated]});
  const title=await screen.findByText('RSVP for your family / party');
  expect(screen.getAllByText('Sophie Bennett').length).toBeGreaterThan(0);
  expect(screen.getAllByText('James Bennett').length).toBeGreaterThan(0);
  expect(screen.queryByText('Other Guest')).not.toBeInTheDocument();
  const jamesCard=partyCard('James Bennett');
  fireEvent.click(within(jamesCard).getByRole('button',{name:'Decline'}));
  fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_guest_id:'james',_details:{rsvp:'Not Attending'},_additional:[]})));
  expect(rpc.mock.calls.filter((call)=>call[0]==='save_guest_details_form').some((call)=>call[1]._guest_id==='other')).toBe(false);
  expect(title).toBeInTheDocument();
});
it('uses the recipient token endpoint for party RSVPs and never sends an unrelated guest',async()=>{
  const james={id:'james',event_id:'event',first_name:'James',last_name:'Bennett',rsvp:'Pending',family_group:'Bennett Couple'};
  const unrelated={id:'other',event_id:'event',first_name:'Other',last_name:'Guest',rsvp:'Pending',family_group:'Other Family'};
  const onUpdate=vi.fn();const onOpenChange=vi.fn();
  mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james,unrelated],onUpdate,onOpenChange});
  const jamesCard=(await screen.findAllByText('James Bennett'),partyCard('James Bennett'));
  fireEvent.click(within(jamesCard).getByRole('button',{name:'Decline'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_invitation_rsvps',{
    _access_token:'opaque-token', _responses:[{guest_id:'james',rsvp:'Not Attending'}],
  }));
  expect(await within(jamesCard).findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Save My Details'})).toBeEnabled();
  expect(screen.getAllByRole('button',{name:'Close'}).at(-1)!).toBeVisible();
  expect(onUpdate).toHaveBeenCalledOnce();
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(rpc.mock.calls.some((call)=>JSON.stringify(call).includes('other'))).toBe(false);
});
it('shows written pending, attending and declined badges and updates a party badge immediately',async()=>{
  const james={id:'james',event_id:'event',first_name:'James',last_name:'Bennett',rsvp:'Pending',family_group:'Bennett Couple'};
  const mia={id:'mia',event_id:'event',first_name:'Mia',last_name:'Bennett',rsvp:'Not Attending',family_group:'Bennett Couple'};
  const view=mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james,mia]});
  await screen.findByText('RSVP for your family / party');
  const sophieBadge=screen.getAllByText('YES').find((element)=>element.hasAttribute('data-rsvp-status'))!;
  const jamesBadge=screen.getAllByText('Pending').find((element)=>element.hasAttribute('data-rsvp-status'))!;
  const miaBadge=screen.getAllByText('NO').find((element)=>element.hasAttribute('data-rsvp-status'))!;
  expect(sophieBadge).toHaveAttribute('data-rsvp-status','attending');
  expect(jamesBadge).toHaveAttribute('data-rsvp-status','pending');
  expect(miaBadge).toHaveAttribute('data-rsvp-status','declined');
  const jamesCard=partyCard('James Bennett');
  fireEvent.click(within(jamesCard).getByRole('button',{name:'Decline'}));
  expect(within(jamesCard).getByText('NO')).toHaveAttribute('data-rsvp-status','declined');
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_invitation_rsvps',{_access_token:'opaque-token',_responses:[{guest_id:'james',rsvp:'Not Attending'}]}));
  expect(await within(jamesCard).findByText('Saved')).toBeInTheDocument();
  view.rerender(<GuestUpdateModal guest={guest} event={{id:'event'}} open onOpenChange={()=>{}} onUpdate={()=>{}} accessToken="opaque-token" enableGroupRsvp allGuests={[guest,{...james,rsvp:'Not Attending'},mia]}/>);
  expect((await screen.findAllByText('NO')).some((element)=>element.getAttribute('data-rsvp-status')==='declined')).toBe(true);
  const css=readFileSync('src/components/GuestLookup/GuestUpdateModal.module.css','utf8');
  expect(css).toContain('.rsvpStatusBadge[data-rsvp-status="pending"]');
  expect(css).toContain('.rsvpStatusBadge[data-rsvp-status="attending"]');
  expect(css).toContain('.rsvpStatusBadge[data-rsvp-status="declined"]');
});
it('shows Saving, blocks rapid duplicate requests, and rolls back a failed recipient RSVP for retry',async()=>{
  const james={id:'james',event_id:'event',first_name:'James',last_name:'Bennett',rsvp:'Pending',family_group:'Bennett Couple'};
  let rejectSave:(value:{data:null,error:{message:string}})=>void=()=>{};
  rpc.mockImplementation((name)=>name==='get_guest_details_form_authorized' ? Promise.resolve({data:context,error:null}) : new Promise((resolve)=>{rejectSave=resolve;}));
  mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james]});
  const jamesCard=(await screen.findAllByText('James Bennett'),partyCard('James Bennett'));
  const decline=within(jamesCard).getByRole('button',{name:'Decline'});
  fireEvent.click(decline);
  fireEvent.click(decline);
  expect(within(jamesCard).getByText('Saving…')).toBeInTheDocument();
  expect(within(jamesCard).getByRole('button',{name:'Accept'})).toBeDisabled();
  expect(within(jamesCard).getByRole('button',{name:'Decline'})).toBeDisabled();
  expect(rpc.mock.calls.filter(call=>call[0]==='save_guest_invitation_rsvps')).toHaveLength(1);
  rejectSave({data:null,error:{message:'Temporary failure'}});
  expect(await within(jamesCard).findByText('Unable to save. Please try again.')).toBeInTheDocument();
  expect(within(jamesCard).getByText('Pending')).toHaveAttribute('data-rsvp-status','pending');
  expect(within(jamesCard).getByRole('button',{name:'Decline'})).toBeEnabled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Unable to save RSVP',variant:'destructive'}));
});
it('keeps immediate recipient RSVP saves and provides a details-save footer in the mobile portal',async()=>{
  mobile.value=true;
  const james={id:'james',event_id:'event',first_name:'James',last_name:'Bennett',rsvp:'Pending',family_group:'Bennett Couple'};
  const onOpenChange=vi.fn();
  mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james],onOpenChange});
  const jamesCard=(await screen.findAllByText('James Bennett'),partyCard('James Bennett'));
  expect(screen.getByRole('button',{name:'Save My Details'})).toBeEnabled();
  expect(screen.getAllByRole('button',{name:'Close'}).at(-1)!).toBeVisible();
  fireEvent.click(within(jamesCard).getByRole('button',{name:'Accept'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_invitation_rsvps',{_access_token:'opaque-token',_responses:[{guest_id:'james',rsvp:'Attending'}]}));
  expect(await within(jamesCard).findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(onOpenChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button',{name:'Close'})[0]);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
it('omits main seating fields and never sends seat fields',async()=>{mount();await screen.findByLabelText('Email Address');expect(screen.queryByLabelText('Table')).not.toBeInTheDocument();expect(screen.queryByLabelText('Seat Number')).not.toBeInTheDocument();expect(screen.queryByText('Only the organiser can change table and seat assignments.')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc.mock.calls.some(c=>c[0]==='save_guest_details_form')).toBe(true));const payload=rpc.mock.calls.find(c=>c[0]==='save_guest_details_form')[1]._details;expect(payload).not.toHaveProperty('seat_no');expect(payload).not.toHaveProperty('table_id');expect(payload).not.toHaveProperty('table_no');});
it('prefills and saves corrected main names to the same guest without group or seating fields',async()=>{const onUpdate=vi.fn();rpc.mockImplementation(async name=>({data:name==='get_guest_details_form'?{...context,allow_name_edit:true,guest:{...context.guest,first_name:'James',last_name:'Benett'}}:true,error:null}));mount({onUpdate});const first=await screen.findByLabelText('First Name *');const last=screen.getByLabelText('Last Name *');expect(first).toHaveValue('James');expect(last).toHaveValue('Benett');expect(first.parentElement?.parentElement).toBe(last.parentElement?.parentElement);expect(first.parentElement?.parentElement).toHaveClass('grid-cols-2');const group=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;const email=screen.getByLabelText('Email Address');expect(last.compareDocumentPosition(email)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(group.compareDocumentPosition(email)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();fireEvent.change(last,{target:{value:'Bennett'}});fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_event_id:'event',_guest_id:'sophie',_details:expect.objectContaining({first_name:'James',last_name:'Bennett'})})));const payload=rpc.mock.calls.find(c=>c[0]==='save_guest_details_form')[1]._details;expect(payload).not.toHaveProperty('family_group');expect(payload).not.toHaveProperty('table_id');expect(payload).not.toHaveProperty('table_no');expect(payload).not.toHaveProperty('seat_no');expect(onUpdate).toHaveBeenCalledOnce();});
it('places the complete group box first while preserving personal detail and song field order',async()=>{rpc.mockImplementation(async(name)=>({data:name==='get_guest_details_form'?{...context,allow_name_edit:true}:name==='get_guest_song_requests_for_guest'?[]:true,error:null}));mount({event:{id:'event',collect_guest_addresses:true},songRequestsEnabled:true,songRequestsMax:1});const first=await screen.findByLabelText('First Name *');const email=screen.getByLabelText('Email Address');const relation=screen.getByLabelText('Current relation');const dietary=screen.getByLabelText('Dietary Requirements');const address=screen.getByLabelText('Mailing Address');const personal=first.closest<HTMLElement>('.rounded-xl')!;const group=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;const song=screen.getByText('Song Requests');const notes=screen.getByLabelText('Special Requests or Notes');for(const field of [first,email,relation,dietary,address])expect(personal).toContainElement(field);expect(personal).toHaveClass('border-primary/40','bg-background','p-3');expect(address.closest('.rounded-xl')).toBe(personal);for(const [before,after] of [[first,email],[email,relation],[relation,dietary],[dietary,address],[group,personal],[personal,song],[song,notes]] as Array<[Element,Element]>){expect(before.compareDocumentPosition(after)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();}expect(within(group).getByText('Guest Category')).toBeInTheDocument();expect(within(group).getByText('Sophie Bennett')).toBeInTheDocument();expect(within(group).getByText('James Bennett')).toBeInTheDocument();expect(within(group).getByRole('button',{name:'Add Additional Guest'})).toBeInTheDocument();});
it('requires nonblank enabled main names and preserves the invalid draft',async()=>{rpc.mockResolvedValue({data:{...context,allow_name_edit:true},error:null});mount();const first=await screen.findByLabelText('First Name *');fireEvent.change(first,{target:{value:'   '}});fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(0);expect(toast).toHaveBeenCalledWith({title:'First and last name are required',variant:'destructive'});expect(first).toHaveValue('   ');});
it('keeps an unsaved main-name correction when the parent recreates the same guest prop',async()=>{rpc.mockResolvedValue({data:{...context,allow_name_edit:true},error:null});const view=mount();const first=await screen.findByLabelText('First Name *');fireEvent.change(first,{target:{value:'Sofie'}});view.rerender(<GuestUpdateModal guest={{...guest}} event={{id:'event'}} open onOpenChange={()=>{}} onUpdate={()=>{}} allGuests={[guest,{id:'james',first_name:'James',last_name:'Bennett',family_group:'Bennett Couple'}]}/>);expect(first).toHaveValue('Sofie');});
it('uses persisted names rather than hidden name drafts when confirming decline',async()=>{rpc.mockImplementation(async name=>({data:name==='get_guest_details_form'?{...context,allow_name_edit:true,guest:{...context.guest,rsvp:'Pending',first_name:'James',last_name:'Bennett'}}:true,error:null}));mount();fireEvent.click(await screen.findByRole('button',{name:'Accept'}));fireEvent.change(await screen.findByLabelText('First Name *'),{target:{value:'Unsaved'}});fireEvent.change(screen.getByLabelText('Last Name *'),{target:{value:'Draft'}});fireEvent.click(screen.getByRole('button',{name:'Decline'}));fireEvent.click(screen.getByRole('button',{name:'Confirm decline'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',{_event_id:'event',_guest_id:'sophie',_details:{rsvp:'Not Attending',first_name:'James',last_name:'Bennett'},_additional:[]}));});
it('hides main name editing when the authoritative server flag is off',async()=>{mount();await screen.findByLabelText('Email Address');expect(screen.queryByLabelText('First Name *')).not.toBeInTheDocument();expect(screen.queryByLabelText('Last Name *')).not.toBeInTheDocument();});
it('requires a group choice and carries the additional guest dietary selection into the save payload',async()=>{mount();fireEvent.click(await screen.findByRole('button',{name:'Add Additional Guest'}));fireEvent.change(screen.getByLabelText('First Name *'),{target:{value:'Sam'}});fireEvent.change(screen.getByLabelText('Last Name *'),{target:{value:'Bennett'}});fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));expect(rpc.mock.calls.some(c=>c[0]==='save_guest_details_form')).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Part of Our Group'}));const additionalDietary=document.getElementById('extra-dietary-0')!;fireEvent.keyDown(additionalDietary,{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'Vegan',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_additional:[expect.objectContaining({first_name:'Sam',group_choice:'group',dietary:'Vegan'})]})));});
it('orders the reminder, Remove and single Add Additional Guest action for the final entry',async()=>{mount();const initialAdd=await screen.findByRole('button',{name:'Add Additional Guest'});fireEvent.click(initialAdd);let add=screen.getByRole('button',{name:'Add Additional Guest'});const firstRemove=screen.getByRole('button',{name:'Remove Guest'});const reminder=screen.getByText('Please, save at bottom');expect(screen.getByText('The organiser will assign their table and seat.')).toBeInTheDocument();expect(add.className).toBe(firstRemove.className);expect(reminder.tagName).toBe('P');expect(reminder.compareDocumentPosition(firstRemove)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(firstRemove.compareDocumentPosition(add)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();const css=readFileSync('src/components/GuestLookup/GuestAdditionalFields.module.css','utf8');expect(css).toMatch(/\.buttonPair\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);expect(css).toMatch(/\.saveReminder\s*\{[\s\S]*color: #55a447 !important/);expect(css).toMatch(/\.saveReminder\s*\{[\s\S]*font-size: 0\.875rem;[\s\S]*font-weight: 500;/);fireEvent.click(add);expect(screen.getAllByRole('button',{name:'Remove Guest'})).toHaveLength(2);expect(screen.getAllByRole('button',{name:'Add Additional Guest'})).toHaveLength(1);fireEvent.click(screen.getAllByRole('button',{name:'Remove Guest'})[0]);expect(screen.getAllByRole('button',{name:'Remove Guest'})).toHaveLength(1);expect(screen.getAllByRole('button',{name:'Add Additional Guest'})).toHaveLength(1);});
it('confirms a decline through an isolated current-guest-only payload',async()=>{const onUpdate=vi.fn();const onOpenChange=vi.fn();mount({onUpdate,onOpenChange});fireEvent.click(await screen.findByRole('button',{name:'Decline'}));expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirm decline'}));await waitFor(()=>expect(rpc.mock.calls.some(c=>c[0]==='save_guest_details_form')).toBe(true));const call=rpc.mock.calls.find(c=>c[0]==='save_guest_details_form');expect(call[1]).toEqual({_event_id:'event',_guest_id:'sophie',_details:{rsvp:'Not Attending'},_additional:[]});expect(rpc.mock.calls.some(c=>c[0]==='submit_guest_song_requests')).toBe(false);expect(onUpdate).toHaveBeenCalledOnce();expect(onOpenChange).toHaveBeenCalledWith(false);});
it('requires a pending guest to Accept before revealing or saving details',async()=>{rpc.mockResolvedValue({data:{...context,guest:{...context.guest,rsvp:'Pending'}},error:null});mount();await screen.findByRole('button',{name:'Accept'});expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Save My Details'})).toBeDisabled();expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'Accept'}));expect(await screen.findByLabelText('Email Address')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save My Details'})).toBeEnabled();expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(0);});
it('omits the header explanation and centres the pending instruction',async()=>{rpc.mockResolvedValue({data:{...context,guest:{...context.guest,rsvp:'Pending'}},error:null});mount();expect(screen.queryByText('Your response will be sent to the event organiser when you save your details or confirm your decline.')).not.toBeInTheDocument();const instruction=await screen.findByText('Please choose Accept or Decline to continue.');expect(instruction).toHaveClass('text-center');});
it('keeps status, Accept and Decline together in the bordered RSVP row',async()=>{mount();const status=await screen.findByText(/^RSVP Status:/);const accept=screen.getByRole('button',{name:'Accept'});const decline=screen.getByRole('button',{name:'Decline'});expect(status.parentElement).toContainElement(accept);expect(status.parentElement).toContainElement(decline);expect(status.compareDocumentPosition(accept)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(accept.compareDocumentPosition(decline)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();const css=readFileSync('src/components/GuestLookup/GuestUpdateModal.module.css','utf8');expect(css).toMatch(/\.rsvpStatusPanel\s*\{[\s\S]*display: flex[\s\S]*align-items: center[\s\S]*border: 1px solid hsl\(var\(--primary\)\)[\s\S]*border-radius: 9999px/);});
it('preserves local drafts when toggling Accept to Decline and back without persisting them',async()=>{rpc.mockResolvedValue({data:{...context,guest:{...context.guest,rsvp:'Pending'}},error:null});mount();fireEvent.click(await screen.findByRole('button',{name:'Accept'}));const email=await screen.findByLabelText('Email Address');fireEvent.change(email,{target:{value:'draft@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Add Additional Guest'}));fireEvent.change(screen.getByLabelText('First Name *'),{target:{value:'Henry'}});fireEvent.click(screen.getByRole('button',{name:'Decline'}));expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'Accept'}));expect(await screen.findByLabelText('Email Address')).toHaveValue('draft@example.test');expect(screen.getByLabelText('First Name *')).toHaveValue('Henry');});
it('does not submit hidden drafts when confirming decline after starting details',async()=>{rpc.mockResolvedValue({data:{...context,guest:{...context.guest,rsvp:'Pending'}},error:null});mount();fireEvent.click(await screen.findByRole('button',{name:'Accept'}));fireEvent.change(await screen.findByLabelText('Email Address'),{target:{value:'unsaved@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Add Additional Guest'}));fireEvent.change(screen.getByLabelText('First Name *'),{target:{value:'Unfinished'}});fireEvent.click(screen.getByRole('button',{name:'Decline'}));fireEvent.click(screen.getByRole('button',{name:'Confirm decline'}));await waitFor(()=>expect(rpc.mock.calls.filter(c=>c[0]==='save_guest_details_form')).toHaveLength(1));expect(rpc.mock.calls.find(c=>c[0]==='save_guest_details_form')[1]).toEqual({_event_id:'event',_guest_id:'sophie',_details:{rsvp:'Not Attending'},_additional:[]});});
it('keeps a failed decline unsaved and available to retry',async()=>{const onUpdate=vi.fn();const onOpenChange=vi.fn();rpc.mockImplementation(async(name)=>name==='get_guest_details_form'?{data:{...context,guest:{...context.guest,rsvp:'Pending'}},error:null}:{data:null,error:{message:'RSVP changes are currently closed'}});mount({onUpdate,onOpenChange});fireEvent.click(await screen.findByRole('button',{name:'Decline'}));fireEvent.click(screen.getByRole('button',{name:'Confirm decline'}));await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Unable to confirm decline',variant:'destructive'})));expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'RSVP decline confirmed'}));expect(onUpdate).not.toHaveBeenCalled();expect(onOpenChange).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Confirm decline'})).toBeEnabled();expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();});
it('lets a persisted declined guest change back to Accept through the existing confirmation flow',async()=>{rpc.mockResolvedValue({data:{...context,guest:{...context.guest,rsvp:'Not Attending'}},error:null});mount();await screen.findByText('Your decline is confirmed. Choose Accept if you need to change your response.');expect(screen.queryByRole('button',{name:'Confirm decline'})).not.toBeInTheDocument();expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Accept'}));expect(await screen.findByLabelText('Email Address')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));expect(screen.getByRole('alertdialog',{name:'RSVP Already Submitted'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Yes, Update RSVP'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_details:expect.objectContaining({rsvp:'Attending'})})));});
it('keeps organiser restrictions on additional guests and RSVP',async()=>{rpc.mockResolvedValue({data:{...context,can_add:false,can_rsvp:false},error:null});mount();await screen.findByLabelText('Email Address');expect(screen.queryByRole('button',{name:'Add Additional Guest'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Accept'})).not.toBeInTheDocument();});
it('places relation, dietary and grouped address rows in one song-style personal-details panel',async()=>{mount({event:{id:'event',collect_guest_addresses:true}});const email=await screen.findByLabelText('Email Address');const relation=screen.getByLabelText('Current relation');const dietary=screen.getByLabelText('Dietary Requirements');const address=screen.getByLabelText('Mailing Address');const suburb=screen.getByLabelText('Suburb');const state=screen.getByLabelText('State');const postcode=screen.getByLabelText('Postcode');const firstRow=address.parentElement?.parentElement;const secondRow=state.parentElement?.parentElement;const panel=address.closest('.rounded-xl');expect(firstRow).toBe(suburb.parentElement?.parentElement);expect(secondRow).toBe(postcode.parentElement?.parentElement);expect(firstRow).not.toBe(secondRow);expect(firstRow).toHaveClass('grid-cols-2');expect(secondRow).toHaveClass('grid-cols-2');expect(panel).toHaveClass('space-y-4','rounded-xl','border','border-primary/40','bg-background','p-3');for(const field of [email,relation,dietary,address,suburb,state,postcode])expect(panel).toContainElement(field);expect(firstRow?.parentElement).toHaveClass('space-y-3');expect(firstRow?.parentElement).not.toHaveClass('rounded-xl','border');expect(relation.compareDocumentPosition(dietary)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(dietary.compareDocumentPosition(address)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(address.compareDocumentPosition(suburb)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(suburb.compareDocumentPosition(state)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();});
it('does not strand details when RSVP changes are closed',async()=>{rpc.mockResolvedValue({data:{...context,can_rsvp:false,guest:{...context.guest,rsvp:'Pending'}},error:null});mount();expect(await screen.findByText('RSVP changes are currently closed by the organiser. You can still review and update the available details below.')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Accept'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Decline'})).not.toBeInTheDocument();expect(screen.getByLabelText('Email Address')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save My Details'})).toBeEnabled();});
it('uses named relation columns and saves a selected relation',async()=>{mount();fireEvent.click(await screen.findByRole('button',{name:'Assign Relation'}));expect(screen.getByText('Wendy')).toBeInTheDocument();expect(screen.getByText('Tom')).toBeInTheDocument();fireEvent.click(screen.getAllByRole('button',{name:/^Father$/})[0]);fireEvent.click(screen.getByRole('button',{name:/^Select$/}));fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_details:expect.objectContaining({relation_partner:'partner_one',relation_role:'father'})})));});
it('uses two vertical partner columns, ordered roles and premium icon footer actions',async()=>{mount();await screen.findByLabelText('Email Address');const relationInput=screen.getByLabelText('Current relation');expect(relationInput).toHaveValue('Wendy / Guest');const assign=screen.getByRole('button',{name:'Assign Relation'});expect(relationInput.parentElement?.children).toHaveLength(2);fireEvent.click(assign);const popup=screen.getByRole('dialog',{name:'Assign Relation'});const expected=['Bridal Party','Father','Mother','Brother','Sister','Cousin','Uncle','Auntie','Guest','Vendor'];const labels=(name:string)=>within(screen.getByText(name).parentElement!).getAllByRole('button').map(button=>button.textContent?.replace('✓ ',''));expect(labels('Wendy')).toEqual(['Organizer','Bride',...expected]);expect(labels('Tom')).toEqual(['Organizer','Groom',...expected]);expect(within(popup).getAllByRole('button',{name:/Guest/})).toHaveLength(2);const select=within(popup).getByRole('button',{name:'Select'});const cancel=within(popup).getByRole('button',{name:'Cancel'});expect(select).toHaveClass('bg-green-500','text-white');expect(cancel).toHaveClass('bg-red-500','text-white');expect(select.querySelector('svg')).toHaveClass('text-white');expect(cancel.querySelector('svg')).toHaveClass('text-white');const css=readFileSync('src/components/GuestLookup/GuestRelationField.module.css','utf8');const themeCss=readFileSync('src/pages/GuestLookup.module.css','utf8');expect(css).toMatch(/\.relationRow\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*margin-inline: auto/);expect(css).toMatch(/\.relationDialog\s*\{[\s\S]*max-width: 680px[\s\S]*max-height: calc\(100dvh - 32px\)[\s\S]*overflow-y: auto/);expect(css).toMatch(/\.partnerGrid\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);expect(css).toMatch(/\.roleGrid\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);expect(css).toMatch(/\.partnerHeading\.partnerHeading\s*\{[\s\S]*border: 1px solid currentColor[\s\S]*color: #f3e7d8[\s\S]*font-size: 20px !important[\s\S]*overflow-wrap: anywhere/);expect(css).toMatch(/\.footerActions\s*\{[\s\S]*margin-inline: auto/);expect(css).not.toContain('max-h-48');expect(css).toMatch(/\.selectButton\.selectButton,[\s\S]*linear-gradient\(180deg, #7bd880, #55a447\)/);expect(css).toMatch(/\.cancelButton\.cancelButton,[\s\S]*linear-gradient\(180deg, #f85b53, #d9342c\)/);expect(themeCss).toMatch(/button[\s\S]*:not\(\[role="combobox"\]\)[\s\S]*:not\(\[class\*="bg-green"\]\):not\(\[class\*="bg-red"\]\)/);expect(themeCss).toMatch(/svg:not\(\[class\*="text-green"\]\):not\(\[class\*="text-red"\]\)[\s\S]*:not\(\[class\*="text-white"\]\)/);});
it('shows built-in self roles and standard choices even when custom roles are enabled and configured',async()=>{rpc.mockResolvedValue({data:{...context,allow_custom:true,custom_roles:['Colleague']},error:null});mount();fireEvent.click(await screen.findByRole('button',{name:'Assign Relation'}));expect(within(screen.getByText('Wendy').parentElement!).getAllByRole('button')).toHaveLength(12);expect(within(screen.getByText('Tom').parentElement!).getAllByRole('button')).toHaveLength(12);expect(screen.queryByText('Create Other')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Add Other'})).not.toBeInTheDocument();expect(screen.queryByLabelText('Custom relationship title')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Colleague'})).not.toBeInTheDocument();});
it('preserves an existing saved custom relation when the guest leaves it untouched',async()=>{rpc.mockResolvedValue({data:{...context,allow_custom:true,custom_roles:['Colleague'],guest:{...context.guest,relation_partner:'partner_one',relation_role:'custom_colleague',relation_display:'Wendy / Colleague'}},error:null});mount();expect(await screen.findByLabelText('Current relation')).toHaveValue('Wendy / Colleague');fireEvent.click(screen.getByRole('button',{name:'Assign Relation'}));const popup=screen.getByRole('dialog',{name:'Assign Relation'});expect(within(popup).queryByRole('button',{name:'Colleague'})).not.toBeInTheDocument();fireEvent.click(within(popup).getByRole('button',{name:'Cancel'}));fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_details:expect.objectContaining({relation_partner:'partner_one',relation_role:'custom_colleague',custom_relation:''})})));});
it('keeps unsaved values on save failure',async()=>{rpc.mockImplementation(async(name)=>name==='get_guest_details_form'?{data:context,error:null}:{data:null,error:{message:'Additional guests are not permitted'}});mount();const email=await screen.findByLabelText('Email Address');fireEvent.change(email,{target:{value:'changed@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'})));expect(email).toHaveValue('changed@example.test');});
it('preserves authoritative prefill when the parent recreates the guest prop',async()=>{const view=mount();const email=await screen.findByLabelText('Email Address');expect(email).toHaveValue('sophie@example.test');view.rerender(<GuestUpdateModal guest={{...guest}} event={{id:'event'}} open onOpenChange={()=>{}} onUpdate={()=>{}} allGuests={[guest,{id:'james',first_name:'James',last_name:'Bennett',family_group:'Bennett Couple'}]}/>);expect(email).toHaveValue('sophie@example.test');});
it('fills only the current category while keeping all status labels visible',async()=>{mount();await screen.findByLabelText('Email Address');const categories=Array.from(document.querySelectorAll<HTMLElement>('[data-selected]'));const individual=categories.find(node=>node.textContent==='Individual')!;const couple=categories.find(node=>node.textContent==='Couple')!;const family=categories.find(node=>node.textContent==='Family')!;expect(individual).toHaveAttribute('data-selected','false');expect(couple).toHaveAttribute('data-selected','true');expect(family).toHaveAttribute('data-selected','false');expect(categories).toHaveLength(3);const css=readFileSync('src/components/GuestLookup/GuestUpdateModal.module.css','utf8');expect(css).toMatch(/\.categoryOption\s*\{[\s\S]*background: transparent/);expect(css).toContain('.categoryIndividual[data-selected="true"]');expect(css).toContain('.categoryCouple[data-selected="true"]');expect(css).toContain('.categoryFamily[data-selected="true"]');expect(css).not.toContain(':not([data-selected="true"])');});
it('uses the calculated category colour for the doubled group-section border and smaller heading',async()=>{mount();await screen.findByLabelText('Email Address');const section=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section');expect(section).toHaveAttribute('data-category','couple');const css=readFileSync('src/components/GuestLookup/GuestUpdateModal.module.css','utf8');expect(css).toMatch(/\.groupSection\s*\{[\s\S]*border-width: 2px/);expect(css).toMatch(/\.groupSection\[data-category="couple"\][\s\S]*border-color: #e84c12/);expect(css).toMatch(/\.groupSection \.groupSectionHeading\s*\{[\s\S]*color: var\(--guest-category-colour\)[\s\S]*font-size: 18px/);});
it('places Guest Category inside the first group box below its heading and before contact fields',async()=>{mount();await screen.findByLabelText('Email Address');const heading=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'});const category=screen.getByText('Guest Category').parentElement!;const section=heading.closest('section')!;const email=screen.getByLabelText('Email Address');expect(section).toContainElement(category);expect(heading.compareDocumentPosition(category)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(section.compareDocumentPosition(email)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();});
it('places the complete category group before the single RSVP block and keeps footer actions last',async()=>{mount();await screen.findByLabelText('Email Address');const rsvp=screen.getByText(/^RSVP Status:/);const category=screen.getByText('Guest Category');const save=screen.getByRole('button',{name:'Save My Details'});expect(screen.getAllByText(/^RSVP Status:/)).toHaveLength(1);expect(category.compareDocumentPosition(rsvp)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(category.compareDocumentPosition(save)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();});
it('keeps RSVP action treatments while centering their narrower equal-width pair',async()=>{mount();await screen.findByLabelText('Email Address');const accept=screen.getByRole('button',{name:'Accept'});const decline=screen.getByRole('button',{name:'Decline'});const save=screen.getByRole('button',{name:'Save My Details'});const cancel=screen.getAllByRole('button',{name:'Close'}).at(-1)!;expect(accept.className).toContain(save.className.split(' ').find(name=>name.includes('saveButton')));expect(decline.className).toContain(cancel.className.split(' ').find(name=>name.includes('cancelButton')));expect(accept.parentElement).toBe(decline.parentElement);const css=readFileSync('src/components/GuestLookup/GuestUpdateModal.module.css','utf8');expect(css).toMatch(/\.rsvpActionRow\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*max-width: 336px[\s\S]*margin-left: auto/);expect(css).toMatch(/\.actionButton\s*\{[\s\S]*min-height: 30px[\s\S]*font-size: 14px/);expect(css).toMatch(/\.actionButton svg\s*\{[\s\S]*width: 14px;[\s\S]*color: #fff !important/);expect(css).toMatch(/\.saveButton:hover[\s\S]*filter: brightness\(1\.04\)/);expect(css).toMatch(/\.cancelButton:hover[\s\S]*filter: brightness\(\.93\)/);});

for (const mobileView of [false, true]) {
  it('warns before closing unsaved details and supports keeping or discarding on '+(mobileView?'mobile':'desktop'), async()=>{
    mobile.value=mobileView;
    const onOpenChange=vi.fn();
    mount({accessToken:'opaque-token',onOpenChange});
    const email=await screen.findByLabelText('Email Address');
    fireEvent.change(email,{target:{value:'draft@example.test'}});
    fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Unsaved edits');
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Keep Editing'}));
    expect(email).toHaveValue('draft@example.test');
    fireEvent.click(screen.getAllByRole('button',{name:'Close'})[0]);
    fireEvent.click(await screen.findByRole('button',{name:'Discard Edits'}));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(rpc.mock.calls.filter(([name])=>name.startsWith('save_'))).toHaveLength(0);
  });
  it('closes without warning after a reverted detail edit on '+(mobileView?'mobile':'desktop'),async()=>{
    mobile.value=mobileView;
    const onOpenChange=vi.fn();mount({accessToken:'opaque-token',onOpenChange});
    const email=await screen.findByLabelText('Email Address');
    fireEvent.change(email,{target:{value:'draft@example.test'}});
    fireEvent.change(email,{target:{value:'sophie@example.test'}});
    fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('does not warn for an immediately saved RSVP on '+(mobileView?'mobile':'desktop'),async()=>{
    mobile.value=mobileView;
    const onOpenChange=vi.fn(),onUpdate=vi.fn();mount({accessToken:'opaque-token',onOpenChange,onUpdate});
    fireEvent.click(await screen.findByRole('button',{name:'Decline'}));
    await waitFor(()=>expect(onUpdate).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
}
it('guards Escape dismissal with unsaved details',async()=>{
  const onOpenChange=vi.fn();mount({accessToken:'opaque-token',onOpenChange});
  fireEvent.change(await screen.findByLabelText('Email Address'),{target:{value:'draft@example.test'}});
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape',code:'Escape'});
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(onOpenChange).not.toHaveBeenCalled();
});

it('retains unsaved contact edits after immediate RSVP saving',async()=>{
  const onOpenChange=vi.fn(),onUpdate=vi.fn();mount({accessToken:'opaque-token',onOpenChange,onUpdate});
  const email=await screen.findByLabelText('Email Address');
  fireEvent.change(email,{target:{value:'draft@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Decline'}));
  await waitFor(()=>expect(onUpdate).toHaveBeenCalled());
  expect(email).toHaveValue('draft@example.test');
  fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(onOpenChange).not.toHaveBeenCalled();
});
it('warns about unsaved song requests',async()=>{
  rpc.mockImplementation(async(name)=>({data:name.startsWith('get_guest_details')?context:name==='get_guest_song_requests_for_guest'?[]:true,error:null}));
  mount({accessToken:'opaque-token',songRequestsEnabled:true,songRequestsMax:1});
  fireEvent.change((await screen.findAllByLabelText('Song Title'))[0],{target:{value:'Draft song'}});
  fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!);
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
});

for (const mobileView of [false,true]) {
 it('loads and saves distinct member records and safely switches on '+(mobileView?'mobile':'desktop'),async()=>{
  mobile.value=mobileView;HTMLElement.prototype.scrollTo=vi.fn();
  const james={...guest,id:'james',first_name:'James',email:'james@example.test',mobile:'222'};
  const records:any={sophie:{...context.guest,mobile:'111'},james};
  rpc.mockImplementation(async(name,args)=>{
   if(name.startsWith('get_guest_details'))return {data:{...context,guest:{...records[args._guest_id]}},error:null};
   if(name==='save_guest_details_form_authorized'){records[args._guest_id]={...records[args._guest_id],...args._details};return {data:true,error:null};}
   return {data:true,error:null};
  });
  const onOpenChange=vi.fn();mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james],onOpenChange});
  const memberButton=(name:string)=>within(partyCard(name)).getByRole('button',{name:'Update'});
  expect(await screen.findByLabelText('Email Address')).toHaveValue('sophie@example.test');
  fireEvent.click(memberButton('James Bennett'));
  await waitFor(()=>expect(screen.getByLabelText('Email Address')).toHaveValue('james@example.test'));
  expect(screen.getByLabelText('Mobile Number')).toHaveValue('222');
  expect(screen.getByText('- update details below').parentElement).toHaveTextContent('James Bennett');
  fireEvent.change(screen.getByLabelText('Email Address'),{target:{value:'james.changed@example.test'}});
  fireEvent.click(memberButton('Sophie Bennett'));
  fireEvent.click(await screen.findByRole('button',{name:'Keep Editing'}));
  expect(screen.getByLabelText('Email Address')).toHaveValue('james.changed@example.test');
  fireEvent.click(memberButton('Sophie Bennett'));
  fireEvent.click(await screen.findByRole('button',{name:'Save and Switch'}));
  await waitFor(()=>expect(screen.getByLabelText('Email Address')).toHaveValue('sophie@example.test'));
  expect(records.james.email).toBe('james.changed@example.test');expect(records.sophie.email).toBe('sophie@example.test');
  expect(onOpenChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Mobile Number'),{target:{value:'333'}});
  fireEvent.click(memberButton('James Bennett'));fireEvent.click(await screen.findByRole('button',{name:'Discard and Switch'}));
  await waitFor(()=>expect(screen.getByLabelText('Email Address')).toHaveValue('james.changed@example.test'));
  expect(records.sophie.mobile).toBe('111');
  fireEvent.change(screen.getByLabelText('Mobile Number'),{target:{value:'444'}});
  fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));
  await waitFor(()=>expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(records.james.mobile).toBe('444');expect(records.sophie.mobile).toBe('111');
 });
 it('keeps the selected member and draft when Save and Switch fails on '+(mobileView?'mobile':'desktop'),async()=>{
  mobile.value=mobileView;HTMLElement.prototype.scrollTo=vi.fn();
  mount({accessToken:'opaque-token',enableGroupRsvp:true});
  fireEvent.change(await screen.findByLabelText('Email Address'),{target:{value:'draft@example.test'}});
  const card=partyCard('James Bennett');
  fireEvent.click(within(card).getByRole('button',{name:'Update'}));
  rpc.mockImplementation(async()=>({data:null,error:new Error('Save failed')}));
  fireEvent.click(await screen.findByRole('button',{name:'Save and Switch'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'})));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep Editing'}));
  expect(screen.getByLabelText('Email Address')).toHaveValue('draft@example.test');
  expect(screen.getByText('- update details below').parentElement).toHaveTextContent('Sophie Bennett');
 });
}

it('uses the themed dietary selector on mobile and submits the selected value',async()=>{mobile.value=true;mount();const dietary=await screen.findByLabelText('Dietary Requirements');expect(dietary).toHaveAttribute('role','combobox');fireEvent.keyDown(dietary,{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'Gluten Free',exact:true}));expect(dietary).toHaveTextContent('Gluten Free');fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_details:expect.objectContaining({dietary:'Gluten Free'})})));});
it('offers and saves Guest above Vendor for either partner',async()=>{mount();fireEvent.click(await screen.findByRole('button',{name:'Assign Relation'}));const column=screen.getByText('Tom').parentElement!;const buttons=within(column).getAllByRole('button');expect(buttons.slice(-2).map(button=>button.textContent)).toEqual(['Guest','Vendor']);fireEvent.click(within(column).getByRole('button',{name:'Guest',exact:true}));fireEvent.click(within(screen.getByRole('dialog',{name:'Assign Relation'})).getByRole('button',{name:'Select'}));expect(screen.getByLabelText('Current relation')).toHaveValue('Tom / Guest');fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('save_guest_details_form',expect.objectContaining({_details:expect.objectContaining({relation_partner:'partner_two',relation_role:'guest'})})));});

for (const mobileView of [false,true]) {
 it('edits the lower member relation and dietary without overwriting another guest on '+(mobileView?'mobile':'desktop'),async()=>{
  mobile.value=mobileView;HTMLElement.prototype.scrollTo=vi.fn();
  const james={...context.guest,id:'james',first_name:'James',dietary:'Vegan',relation_partner:'partner_two',relation_role:'father'};
  const records:any={sophie:{...context.guest,dietary:'Vegetarian'},james};
  rpc.mockImplementation(async(name,args)=>{
   if(name.startsWith('get_guest_details'))return {data:{...context,guest:{...records[args._guest_id]}},error:null};
   if(name==='save_guest_details_form_authorized'){records[args._guest_id]={...records[args._guest_id],...args._details};return {data:true,error:null};}
   return {data:true,error:null};
  });
  mount({accessToken:'opaque-token',enableGroupRsvp:true,allGuests:[guest,james]});
  await screen.findByLabelText('Email Address');
  const lower=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;
  fireEvent.click(within(partyCard('James Bennett')).getByRole('button',{name:'Update'}));
  const dietary=await screen.findByLabelText('Dietary Requirements');
  const editor=screen.getByLabelText('Email Address').closest('.rounded-xl')!;
  expect(editor).toContainElement(dietary);
  expect(dietary).toHaveTextContent('Vegan');expect(within(editor as HTMLElement).getByLabelText('Current relation')).toHaveValue('Tom / Father');
  expect(screen.getAllByLabelText('Dietary Requirements')).toHaveLength(1);
  fireEvent.keyDown(dietary,{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'Gluten Free',exact:true}));
  fireEvent.click(within(editor as HTMLElement).getByRole('button',{name:'Assign Relation'}));
  const partner=screen.getByText('Wendy').parentElement!;fireEvent.click(within(partner).getByRole('button',{name:'Brother',exact:true}));
  fireEvent.click(within(screen.getByRole('dialog',{name:'Assign Relation'})).getByRole('button',{name:'Select',exact:true}));
  expect(within(editor as HTMLElement).getByLabelText('Current relation')).toHaveValue('Wendy / Brother');
  fireEvent.click(screen.getByRole('button',{name:'Save My Details'}));
  await waitFor(()=>expect(records.james.dietary).toBe('Gluten Free'));
  expect(records.james.relation_partner).toBe('partner_one');expect(records.james.relation_role).toBe('brother');
  expect(records.sophie.dietary).toBe('Vegetarian');expect(records.sophie.relation_role).toBe('guest');
  expect(rpc).toHaveBeenCalledWith('save_guest_details_form_authorized',expect.objectContaining({_guest_id:'james',_access_token:'opaque-token',_additional:[]}));
 });
 it('keeps unsaved main edits when a lower member switch is cancelled on '+(mobileView?'mobile':'desktop'),async()=>{
  mobile.value=mobileView;HTMLElement.prototype.scrollTo=vi.fn();mount({enableGroupRsvp:true});
  fireEvent.change(await screen.findByLabelText('Email Address'),{target:{value:'draft@example.test'}});
  const lower=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;
  fireEvent.click(within(partyCard('James Bennett')).getByRole('button',{name:'Update'}));
  fireEvent.click(await screen.findByRole('button',{name:'Keep Editing'}));
  expect(screen.getByLabelText('Email Address')).toHaveValue('draft@example.test');
  expect(rpc.mock.calls.filter(c=>c[0].startsWith('save_guest'))).toHaveLength(0);
 });
}

it('keeps the dashboard invitation order in both lists when a later family member opens their editor',async()=>{
 const family=[{...guest,id:'nader',first_name:'Nader'},{...guest,id:'nahla',first_name:'Nahla'},{...guest,id:'kamal',first_name:'Kamal'},{...guest,id:'hala',first_name:'Hala'}];
 rpc.mockImplementation(async(name,args)=>({data:name.startsWith('get_guest_details')?{...context,guest:{...family.find(g=>g.id===args._guest_id)}}:true,error:null}));
 const {container}=mount({guest:family[3],allGuests:family,enableGroupRsvp:true});
 await screen.findByLabelText('Email Address');
 const rows=[...document.querySelectorAll('[class*="partyMemberCard"]')];
 for(const row of rows)expect([...row.querySelectorAll('button')].map(n=>n.textContent)).toEqual(['Accept','Decline','Update']);
 expect(rows.map(row=>row.querySelector('label')?.textContent?.trim())).toEqual(['Nader Bennett','Nahla Bennett','Kamal Bennett','Hala Bennett']);
 const lower=screen.getByRole('heading',{name:'Couple / Family & Additional Guests'}).closest('section')!;
 expect(lower.querySelectorAll('[data-group-member-update]')).toHaveLength(0);expect(lower.querySelectorAll('[class*=partyMemberCard]')).toHaveLength(4);const intro=screen.getByText('RSVP for your family / party').parentElement!;expect(lower).not.toContainElement(intro);expect(intro.compareDocumentPosition(lower)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByText('- update details below').parentElement).toHaveTextContent('Hala Bennett');
});
