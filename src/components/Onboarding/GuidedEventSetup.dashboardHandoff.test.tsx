import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useNavigate,useLocation} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import type {GuidedSetupAnswers,GuidedSetupDraft} from '@/lib/guidedEventSetup';
type Row=Record<string,unknown>;
const state=vi.hoisted(()=>({failOnce:'',events:[] as Row[],budgets:new Map<string,Row>(),tables:[] as Row[],guests:[] as Row[],qrs:[] as Row[],draft:{} as Row,listReads:0}));
class Query {
  private operation = 'select';
  private payload: Row | Row[] | undefined;
  private filters = new Map<string, unknown>();

  constructor(private table: string) {}
  select() { return this; }
  insert(payload: Row | Row[]) { this.operation = 'insert'; this.payload = payload; return this; }
  update(payload: Row) { this.operation = 'update'; this.payload = payload; return this; }
  upsert(payload: Row) { this.operation = 'upsert'; this.payload = payload; return this; }
  eq(field: string, value: unknown) { this.filters.set(field, value); return this; }
  is() { return this; }
  order() { return this; }
  limit() { return this; }
  single() { return Promise.resolve(this.execute(true)); }
  maybeSingle() { return Promise.resolve(this.execute(true)); }
  then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve(this.execute(false)).then(resolve, reject);
  }

  private execute(single: boolean) {
    const payload = Array.isArray(this.payload) ? undefined : this.payload;
    const failureStage = ''; 
    if (state.failOnce && state.failOnce === failureStage) {
      state.failOnce = '';
      return { data: null, error: { code: 'TEST_FAILURE' } };
    }

    if (this.table === 'events') {
      if (this.operation === 'insert') {
        const event = { ...(payload || {}), id: `event-${state.events.length + 1}` };
        state.events.push(event);
        return { data: event, error: null };
      }
      const matches = state.events.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: single ? matches[0] || null : matches, error: null };
    }
    if (this.table === 'onboarding_drafts' && this.operation === 'update') {
      Object.assign(state.draft, payload);
      return { data: state.draft, error: null };
    }
    if (this.table === 'event_budget_settings' && this.operation === 'upsert') {
      state.budgets.set(String(payload?.event_id), { ...payload });
      return { data: payload, error: null };
    }
    if (this.table === 'tables') {
      if (this.operation === 'insert') state.tables.push(...(this.payload as Row[]));
      const rows = state.tables.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: rows, error: null };
    }
    if (this.table === 'guests') {
      if (this.operation === 'update') {
        const rows = state.guests.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
        rows.forEach((row) => Object.assign(row, payload));
        return { data: single ? rows[0] || null : rows, error: null };
      }
      if (this.operation === 'insert') {
        const guest: Row = { ...(payload || {}), id: `guest-${state.guests.length + 1}` };
        const duplicate = state.guests.some((row) => row.event_id === guest.event_id && row.guided_setup_origin === guest.guided_setup_origin);
        if (duplicate) return { data: null, error: { code: '23505' } };
        state.guests.push(guest);
        return { data: guest, error: null };
      }
      const rows = state.guests.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: single ? rows[0] || null : rows, error: null };
    }
    if (this.table === 'dynamic_qr_codes') {
      if (this.operation === 'insert') state.qrs.push(payload || {});
      const rows = state.qrs.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: single ? rows[0] || null : rows, error: null };
    }
    return { data: single ? null : [], error: null };
  }
}


vi.mock('@/integrations/supabase/client',()=>{const channel={on:()=>channel,subscribe:()=>channel};return {supabase:{auth:{getUser:async()=>({data:{user:{id:'owner-1'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})},from:(table:string)=>new Query(table),rpc:async(name:string)=>{if(name==='get_events_with_guest_count'){state.listReads++;return {data:state.events.map(row=>({...row})),error:null}}return {data:'qr-code-1',error:null}},channel:()=>channel,removeChannel:vi.fn()}}});
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/contexts/AuthenticatedSessionContext',()=>({useAuthenticatedSession:()=>({session:{user:{id:'owner-1'}}})}));
const profile={first_name:'Diana',last_name:'',display_countdown_event_id:'carla',profile_image_path:'existing-private-photo'};
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>({profile,loading:false,refreshProfile:async()=>{},updateDisplayCountdownEvent:async()=>{}})}));
vi.mock('@/hooks/useUserPlan',()=>({useUserPlan:()=>({plan:{guest_limit:100,table_limit:5},loading:false})}));
vi.mock('@/hooks/useIsAdmin',()=>({useIsAdmin:()=>({isAdmin:true,loading:false})}));
vi.mock('@/lib/eventAllowance',()=>({getEventAllowanceSnapshot:async()=>({canCreate:true,atCap:false}),getEventCreationBlockMessage:()=>'',getDatabaseEventCreationError:()=>null}));
vi.mock('@/lib/eventHeroImage',()=>({syncEventHeroImage:async()=>{}}));
vi.mock('@/lib/onboardingProfileImage',()=>({seedOnboardingProfileImage:async()=>{}}));
vi.mock('./OnboardingAudio',()=>({OnboardingAudio:()=>null}));
vi.mock('@/components/EventImage/EventImageEditor',()=>({EventImageEditor:()=>null,EventImagePreview:()=>null}));
vi.mock('@/lib/guidedEventSetup',async(importOriginal)=>{const actual=await importOriginal<typeof import('@/lib/guidedEventSetup')>();return {...actual,loadActiveGuidedSetup:async()=>state.draft,beginGuidedSetup:async()=>state.draft,saveGuidedSetup:async(_id:string,answers:GuidedSetupAnswers,current_step:number)=>{Object.assign(state.draft,{answers,current_step});return state.draft}}});
import {GuidedEventSetup} from './GuidedEventSetup';
import {useEvents} from '@/hooks/useEvents';
import {useSelectedEvent,setSelectedEventId,getSelectedEventId} from '@/hooks/useSelectedEvent';
import {clearAllCaches,setCacheUserId} from '@/lib/cacheRegistry';
function Dashboard(){const data=useEvents(),selected=useSelectedEvent(data.events,{loading:data.loading||!data.loaded}),navigate=useNavigate(),location=useLocation();return <><h1>{new URLSearchParams(location.search).get('tab')==='my-events'?'My Events':'Wrong dashboard tab'}</h1><output data-testid='selection'>{selected.selectedEvent?.name}</output><output data-testid='countdown'>{data.activeEventId}</output><ul>{data.events.map(event=><li key={event.id}>{event.name}</li>)}</ul><button onClick={()=>navigate('/onboarding/event-setup?mode=additional&new=1')}>Guided Setup</button></>}
beforeEach(()=>{clearAllCaches();setCacheUserId('owner-1');setSelectedEventId('carla');state.events=[{id:'carla',user_id:'customer-1',name:'Carla & Kallum Wedding'},{id:'hossam',user_id:'owner-1',name:'Hossam & Reema Wedding'}];state.budgets=new Map();state.tables=[];state.guests=[];state.qrs=[];state.listReads=0;state.draft={id:'draft-1',user_id:'owner-1',mode:'additional_event',current_step:9,created_event_id:null,completed_at:null,answers:{celebrationType:'wedding',customerFirstName:'Diana',partnerFirstName:'Michael',eventName:'Diana & Michael Wedding',dateChoice:'exact',exactDate:'2027-03-31',startTime:'17:00',finishTime:'22:00',rsvpUndecided:true,locationChoice:'undecided',partsChoice:'reception-only',eventFormat:'seated',approximateInvited:'18',expectedAttending:'18',tableCreation:'automatic',tableStyle:'round',tableCapacity:'4',headTable:'yes',headTableCount:'2',guestTableCount:'4',budgetChoice:'15000-20000'}};HTMLElement.prototype.scrollIntoView=vi.fn();});
afterEach(()=>clearAllCaches());
it('returns from real completion and Ready to My Events with a refreshed admin list and the newly created selection',async()=>{
 render(<MemoryRouter initialEntries={['/dashboard?tab=my-events']}><Routes><Route path='/dashboard' element={<Dashboard/>}/><Route path='/onboarding/event-setup' element={<GuidedEventSetup/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(screen.getByTestId('selection')).toHaveTextContent('Carla'));
 expect(state.listReads).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'Guided Setup'}));
 await screen.findByText('Step 9 of 10');
 fireEvent.click(screen.getByRole('button',{name:/Create my event/i}));
 await screen.findByText('Step 10 of 10');
 expect(state.events).toHaveLength(3);expect(state.tables).toHaveLength(5);expect(state.guests).toHaveLength(2);expect(state.budgets.get('event-3')).toMatchObject({planned_budget_range:'15000-20000'});expect(state.draft).toMatchObject({created_event_id:'event-3',current_step:10});
 fireEvent.click(screen.getByRole('button',{name:'Enter Wedding Waitress'}));
 await screen.findByRole('heading',{name:'My Events'});
 await waitFor(()=>expect(screen.getByTestId('selection')).toHaveTextContent('Diana & Michael'));
 expect(screen.getByTestId('countdown')).toHaveTextContent('event-3');expect(screen.getAllByRole('listitem')).toHaveLength(3);expect(getSelectedEventId()).toBe('event-3');expect(state.listReads).toBe(2);expect(profile.profile_image_path).toBe('existing-private-photo');
});

