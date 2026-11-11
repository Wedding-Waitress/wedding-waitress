import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({permission:'can_check',rpc:vi.fn()}));
vi.mock('react-router-dom',()=>({useParams:()=>({token:'test-token'})}));
vi.mock('@/hooks/usePhotoCallout',()=>({photoDb:{rpc:fixture.rpc}}));
vi.mock('@/components/SEO/SeoHead',()=>({SeoHead:()=>null}));
vi.mock('@/components/Dashboard/PhotoCallout/PhotoCalloutDocument',()=>({PhotoCalloutDocument:({cards,onCheck}:any)=><div>{cards.map((card:any)=><button key={card.id} disabled={!onCheck} onClick={()=>onCheck(card)}>{card.id}</button>)}</div>}));
import {PhotoCalloutPublicView} from './PhotoCalloutPublicView';
const shared=()=>({event:{id:'a',name:'Example Wedding',date:'2027-03-19',venue:'Example Hall',start_time:'18:00',finish_time:'23:00'},cards:[{id:'one',completed:true},{id:'two',completed:false}],permission:fixture.permission});
beforeEach(()=>{fixture.permission='can_check';fixture.rpc.mockReset();let current=shared();fixture.rpc.mockImplementation(async(name:string,args:any)=>{if(name==='get_photo_callout_by_token')current={...current,permission:fixture.permission};if(name==='check_photo_callout_by_token')current={...current,cards:current.cards.map(c=>c.id===args.p_card_id?{...c,completed:args.p_completed}:c)};return {data:current,error:null};});});
describe('shared header progress',()=>{
 it('displays event details and refreshes the completion count after saving a tick',async()=>{render(<PhotoCalloutPublicView/>);expect(await screen.findByRole('heading',{name:'Example Wedding'})).toBeTruthy();expect(screen.getByText('Photo Call Out Cards = 2 Groups')).toBeTruthy();expect(screen.getByText(/Reception: Friday, 19th March 2027.*Example Hall.*6:00 PM.*11:00 PM/)).toBeTruthy();expect(screen.getByRole('status').textContent).toBe('1 of 2 groups completed');fireEvent.click(screen.getByRole('button',{name:'two'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('2 of 2 groups completed'));expect(fixture.rpc).toHaveBeenCalledWith('check_photo_callout_by_token',{p_token:'test-token',p_card_id:'two',p_completed:true});fireEvent.click(screen.getByRole('button',{name:'one'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('1 of 2 groups completed'));});
 it('keeps view-only recipients read-only while showing their saved count',async()=>{fixture.permission='view_only';render(<PhotoCalloutPublicView/>);expect(await screen.findByText('View Only')).toBeTruthy();expect((screen.getByRole('button',{name:'two'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByRole('status').textContent).toBe('1 of 2 groups completed');expect(fixture.rpc).toHaveBeenCalledTimes(1);});
});
