import React from 'react';
import {render,screen,fireEvent,waitFor,act,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import {AddGuestModal} from './AddGuestModal';
const recorded=vi.hoisted(()=>({insert:vi.fn(),added:vi.fn(),closed:vi.fn(),form:null as any}));
vi.mock('react-hook-form',async()=>{const actual=await vi.importActual<typeof import('react-hook-form')>('react-hook-form');return {...actual,useForm:(options:any)=>{const result=actual.useForm(options);recorded.form=result;return result;}};});
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/hooks/useTables',()=>({useTables:()=>({tables:[{id:'table-1',name:'Table 1',limit_seats:10,guest_count:0}],fetchTables:vi.fn()})}));
vi.mock('@/hooks/useEvents',()=>({useEvents:()=>({events:[{id:'event-1',user_id:'owner-1',relation_mode:'two',partner1_name:'Hossam',partner2_name:'Reema'}]})}));
vi.mock('@/lib/security/monitoring',()=>({guestAddRateLimiter:{isAllowed:()=>true},logSecurityEvent:{suspiciousDataAccess:vi.fn(),validationFailure:vi.fn(),guestCreated:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'owner-1'}}})},from:vi.fn((table:string)=>{let inserting=false;const builder:any={};for(const method of ['select','eq','neq','in','order','limit','delete','update','upsert'])builder[method]=vi.fn(()=>builder);builder.insert=vi.fn((payload:any)=>{inserting=true;recorded.insert(table,payload);return builder;});builder.single=vi.fn(async()=>({data:inserting?{id:'new-guest'}:null,error:null}));builder.maybeSingle=builder.single;builder.then=(resolve:any)=>Promise.resolve({data:[],error:null}).then(resolve);return builder;})}}));
vi.mock('./RelationSelector',()=>({RelationSelector:()=>null}));
vi.mock('./GroupTypeDialog',()=>({GroupTypeDialog:()=>null}));
vi.mock('./RelationAssignmentDialog',()=>({RelationAssignmentDialog:({isOpen}:any)=>isOpen?<div data-testid="relation-required-dialog"/>:null}));
beforeAll(()=>{
  HTMLElement.prototype.scrollIntoView=vi.fn();
  HTMLElement.prototype.hasPointerCapture=()=>false;
  HTMLElement.prototype.setPointerCapture=()=>{};
  HTMLElement.prototype.releasePointerCapture=()=>{};
});
beforeEach(()=>vi.clearAllMocks()); afterEach(cleanup);

const chooseDietary = async (label: string) => {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Dietary Requirements' }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: label, exact: true }));
};
const validGuest = async () => {
  await act(async()=>{
    recorded.form.setValue('first_name','Alex'); recorded.form.setValue('last_name','Smith');
    recorded.form.setValue('table_id','table-1');
  });
  await act(async()=>{ recorded.form.setValue('seat_no',1); });
};
describe('Custom dietary requirements',()=>{
  it('shows the new option after Vendor and saves typed wording through the real form',async()=>{
    render(<AddGuestModal isOpen onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1"/>);
    await validGuest(); await chooseDietary('Other — please specify');
    const input=screen.getByRole('textbox',{name:'Dietary requirement or allergy'});
    expect(input).toHaveAttribute('placeholder','Example: Mushroom allergy — no mushrooms');
    expect(input).toHaveValue('');
    fireEvent.change(input,{target:{value:'Mushroom allergy — no mushrooms'}});
    fireEvent.click(screen.getByRole('button',{name:'Add Guest',exact:true}));
    await waitFor(()=>expect(recorded.insert).toHaveBeenCalledWith('guests',expect.arrayContaining([expect.objectContaining({dietary:'Mushroom allergy — no mushrooms'})])));
  });
  it('requires custom wording and never saves the placeholder as guest data',async()=>{
    render(<AddGuestModal isOpen onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1"/>);
    await validGuest(); await chooseDietary('Other — please specify');
    fireEvent.click(screen.getByRole('button',{name:'Add Guest',exact:true}));
    expect((await screen.findAllByText('Enter the dietary requirement or allergy, or select an existing option.')).length).toBeGreaterThan(0);
    expect(recorded.insert).not.toHaveBeenCalled();
  });
  it('reopens a saved custom requirement and can switch back to a preset',async()=>{
    render(<AddGuestModal isOpen isEdit onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1" editGuest={{id:'existing',first_name:'Alex',last_name:'Smith',table_id:'table-1',seat_no:1,rsvp:'Pending',dietary:'Mushroom allergy — no mushrooms',mobile:null,email:null,notes:null,relation_partner:'',relation_role:'',relation_display:''}}/>);
    expect(await screen.findByRole('textbox',{name:'Dietary requirement or allergy'})).toHaveValue('Mushroom allergy — no mushrooms');
    await chooseDietary('Vegan');
    expect(screen.queryByRole('textbox',{name:'Dietary requirement or allergy'})).not.toBeInTheDocument();
    expect(recorded.form.getValues('dietary')).toBe('Vegan');
  });
});

it('shows existing None values as Not Applicable and removes the duplicate option',async()=>{
  render(<AddGuestModal isOpen isEdit onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1" editGuest={{id:'existing',first_name:'Alex',last_name:'Smith',table_id:'table-1',seat_no:1,rsvp:'Pending',dietary:'None',mobile:null,email:null,notes:null,relation_partner:'',relation_role:'',relation_display:''}}/>);
  const trigger=screen.getByRole('combobox',{name:'Dietary Requirements'});
  expect(trigger).toHaveTextContent('Not Applicable');
  expect(screen.queryByRole('textbox',{name:'Dietary requirement or allergy'})).not.toBeInTheDocument();
  fireEvent.keyDown(trigger,{key:'ArrowDown'});
  expect(await screen.findByRole('option',{name:'Not Applicable',exact:true})).toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'None',exact:true})).not.toBeInTheDocument();
  expect(screen.getByRole('option',{name:'Vendor',exact:true})).toBeInTheDocument();
  expect(screen.getByRole('option',{name:'Other — please specify',exact:true})).toBeInTheDocument();
});
