import {render,screen,act} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/hooks/useEvents',()=>({useEvents:()=>{throw Error('Customer selection writes forbidden');}}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>{throw Error('Customer profile writes forbidden');}}));
import {AdminReadOnlyEventCountdown} from './AdminReadOnlyEventCountdown';
const saved={id:'event',user_id:'owner',name:'Élodie & Jean-Luc',date:'2030-09-12',start_time:'13:18:00',finish_time:'23:00:00'};
const props={ownerId:'owner',customer:{user_id:'owner',display_countdown_event_id:'event'},events:[{id:'event',saved_event:saved}]};
afterEach(()=>vi.useRealTimers());
describe('read-only saved customer countdown',()=>{
 it('reuses customer circle markup with actual owned saved selection and no customer action',()=>{
  render(<AdminReadOnlyEventCountdown {...props}/>);expect(screen.getByText(saved.name)).toBeInTheDocument();expect(document.querySelectorAll('svg[viewBox="0 0 100 100"] circle')).toHaveLength(8);expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(screen.getByText(/approximate 30-day months/)).toBeInTheDocument();
 });
 it.each([{customer:{user_id:'foreign',display_countdown_event_id:'event'}},{customer:{user_id:'owner',display_countdown_event_id:null}},{events:[{id:'event',saved_event:{...saved,user_id:'foreign'}}]},{events:[{id:'event',saved_event:{...saved,date:'2030-02-30'}}]},{events:[{id:'event',saved_event:{...saved,start_time:'29:00'}}]},{events:[{id:'event',saved_event:{...saved,start_time:undefined}}]},{events:[props.events[0],props.events[0]]}])('does not infer selection or accept foreign/invalid saved time %j',patch=>{
  render(<AdminReadOnlyEventCountdown {...props} {...patch}/>);expect(screen.getAllByText('--')).toHaveLength(4);expect(screen.queryByText(saved.name)).not.toBeInTheDocument();expect(screen.getByText(/has not been selected or saved/)).toBeInTheDocument();
 });
 it('ticks locally and immediately removes a previous account countdown on switch',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2029-01-01T00:00:00Z'));const view=render(<AdminReadOnlyEventCountdown {...props}/>);act(()=>vi.advanceTimersByTime(1000));
  view.rerender(<AdminReadOnlyEventCountdown {...props} ownerId="other"/>);expect(screen.queryByText(saved.name)).not.toBeInTheDocument();expect(screen.getAllByText('--')).toHaveLength(4);expect(vi.getTimerCount()).toBe(0);
 });
});
