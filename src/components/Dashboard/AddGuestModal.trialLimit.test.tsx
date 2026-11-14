import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {describe,it,expect,vi,beforeAll,beforeEach} from 'vitest';
import {AddGuestModal} from './AddGuestModal';
import {TrialLimitChoice} from '@/components/Subscription/TrialLimitChoice';
const recorded=vi.hoisted(()=>({insert:vi.fn(),added:vi.fn(),closed:vi.fn(),form:null as any, error:null as any}));
vi.mock('react-hook-form',async()=>{const actual=await vi.importActual<typeof import('react-hook-form')>('react-hook-form');return {...actual,useForm:(options:any)=>{const result=actual.useForm(options);recorded.form=result;return result;}};});
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/hooks/useTables',()=>({useTables:()=>({tables:[{id:'table-1',name:'Table 1',limit_seats:10,guest_count:0}],fetchTables:vi.fn()})}));
vi.mock('@/hooks/useEvents',()=>({useEvents:()=>({events:[{id:'event-1',user_id:'owner-1',relation_mode:'two',partner1_name:'Hossam',partner2_name:'Reema'}]})}));
vi.mock('@/lib/security/monitoring',()=>({guestAddRateLimiter:{isAllowed:()=>true},logSecurityEvent:{suspiciousDataAccess:vi.fn(),validationFailure:vi.fn(),guestCreated:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'owner-1'}}})},from:vi.fn((table:string)=>{let inserting=false;const builder:any={};for(const method of ['select','eq','neq','in','order','limit','delete','update','upsert'])builder[method]=vi.fn(()=>builder);builder.insert=vi.fn((payload:any)=>{inserting=true;recorded.insert(table,payload);return builder;});builder.single=vi.fn(async()=>({data:inserting?{id:'new-guest'}:null,error:inserting?recorded.error:null}));builder.maybeSingle=builder.single;builder.then=(resolve:any)=>Promise.resolve({data:[],error:null}).then(resolve);return builder;})}}));
vi.mock('./RelationSelector',()=>({RelationSelector:()=>null}));
vi.mock('./GroupTypeDialog',()=>({GroupTypeDialog:()=>null}));
vi.mock('./RelationAssignmentDialog',()=>({RelationAssignmentDialog:({isOpen}:any)=>isOpen?<div data-testid="relation-required-dialog"/>:null}));
beforeAll(()=>{HTMLElement.prototype.scrollIntoView=vi.fn();});
describe('Optional guest relationship',()=>{it('saves a valid individual with blank relationship fields without opening assignment',async()=>{render(<AddGuestModal isOpen onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1"/>);fireEvent.change(screen.getByPlaceholderText('Enter first name'),{target:{value:'Matt'}});fireEvent.change(screen.getByPlaceholderText('Enter last name'),{target:{value:'Wilson'}});await act(async()=>{recorded.form.setValue('table_id','table-1');});await act(async()=>{recorded.form.setValue('seat_no',1);});fireEvent.click(screen.getByRole('button',{name:'Add Guest',exact:true}));await waitFor(()=>expect(recorded.insert).toHaveBeenCalledWith('guests',expect.arrayContaining([expect.objectContaining({first_name:'Matt',last_name:'Wilson',relation_partner:'',relation_role:'',relation_display:''})])));expect(screen.queryByTestId('relation-required-dialog')).not.toBeInTheDocument();await waitFor(()=>expect(recorded.added).toHaveBeenCalled());});});

beforeEach(()=>{recorded.insert.mockClear();recorded.added.mockClear();recorded.closed.mockClear();recorded.error=null;});
const submitGuest=async()=>{
 fireEvent.change(screen.getByPlaceholderText('Enter first name'),{target:{value:'Test'}});
 fireEvent.change(screen.getByPlaceholderText('Enter last name'),{target:{value:'Guest'}});
 await act(async()=>{recorded.form.setValue('table_id','table-1');});
 await act(async()=>{recorded.form.setValue('seat_no',1);});
 fireEvent.click(screen.getByRole('button',{name:'Add Guest',exact:true}));
};
function LimitFlow({count}:{count:number}) {
 const [limit,setLimit]=React.useState(false);
 return limit ? <TrialLimitChoice open trialStartedAt="2026-11-01T22:30:00Z" trialEndsAt="2026-11-08T22:30:00Z" onContinue={()=>setLimit(false)} onChoosePackage={()=>{}}/>
 : <AddGuestModal isOpen onClose={recorded.closed} onGuestAdded={recorded.added} eventId="event-1" currentGuestCount={count} allowedGuestLimit={20} onGuestLimitReached={()=>setLimit(true)}/>;
}
describe('Trial guest submission and capacity rejection',()=>{
 it('allows the twentieth guest without opening the limit choice',async()=>{render(<LimitFlow count={19}/>);await submitGuest();await waitFor(()=>expect(recorded.added).toHaveBeenCalled());expect(recorded.insert).toHaveBeenCalled();expect(screen.queryByText('Your free trial')).not.toBeInTheDocument();});
 it('blocks the twenty-first guest and opens the trial dialog before any write',async()=>{render(<LimitFlow count={20}/>);await submitGuest();expect(await screen.findByRole('heading',{name:'Your free trial'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Upgrade Now'})).toBeInTheDocument();expect(recorded.insert).not.toHaveBeenCalled();expect(recorded.added).not.toHaveBeenCalled();});
 it.each(['WW_GUEST_LIMIT_REACHED','WW_EVENT_GUEST_LIMIT_EXCEEDED','Guest limit reached (20/20). Upgrade to add more guests.'])('opens the dialog when the server rejects stale capacity: %s',async(message)=>{recorded.error={message};render(<LimitFlow count={19}/>);await submitGuest();expect(await screen.findByRole('heading',{name:'Your free trial'})).toBeInTheDocument();expect(recorded.added).not.toHaveBeenCalled();});
});
