import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({mobile:false}));vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>mocks.mobile}));
vi.mock('@/integrations/supabase/client',()=>({supabase:new Proxy({}, {get(){throw Error('Customer backend activity forbidden');}})}));
import {AdminReadOnlyEventsTable} from './AdminReadOnlyEventsTable';
const saved={id:'event',user_id:'owner',name:'Élodie & Jean-Luc',date:'2030-09-12',venue:'Saved actual venue',start_time:'13:18:00',finish_time:'23:00:00',guest_limit:100,created_at:'2026-09-12T10:00:00Z',event_created:'2026-09-12',expiry_date:'2027-09-12',created_date_local:'2026-09-12',expiry_date_local:'2027-09-12',event_timezone:'Australia/Sydney',partner1_name:'Élodie',partner2_name:'Jean-Luc',rsvp_deadline:'2030-08-12',event_id:'EVENT-7'};
const props={ownerId:'owner',customer:{user_id:'owner',display_countdown_event_id:'event'},events:[{id:'event',saved_event:saved,guests:[{id:'guest',user_id:'owner',event_id:'event'}]}]};
const show=(patch:any={})=>render(<MemoryRouter><AdminReadOnlyEventsTable {...props} {...patch}/></MemoryRouter>);
beforeEach(()=>{mocks.mobile=false;});
describe('existing customer My Events table in read-only mode',()=>{
 it.each([false,true])('preserves desktop/mobile existing table and disables every customer mutation (%s)',mobile=>{
  mocks.mobile=mobile;show();expect(screen.getByText('Saved actual venue')).toBeInTheDocument();expect(screen.getByText(/EVENT-7/)).toBeInTheDocument();
  for(const button of screen.getAllByRole('button')){expect(button).toBeDisabled();fireEvent.click(button);}for(const radio of screen.getAllByRole('radio')){expect(radio).toBeDisabled();fireEvent.click(radio);}
  fireEvent.click(screen.getByText(saved.name));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByText('Events: 1 saved · Read-only')).toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it.each([{...saved,user_id:'foreign'},{...saved,created_at:'not-a-date'},{...saved,created_date_local:undefined},{...saved,event_timezone:'MadeUp/Zone'},{...saved,date:'2030-02-30'},{...saved,start_time:'30:00'},{...saved,guest_limit:-1}])('rejects foreign/incomplete/invalid records without a fabricated event table %j',saved_event=>{
  show({events:[{...props.events[0],saved_event}]});expect(screen.getByText(/have not been manufactured/)).toBeInTheDocument();expect(screen.queryByRole('table')).not.toBeInTheDocument();
 });
 it.each([[{id:'guest',user_id:'foreign',event_id:'event'}],[props.events[0].guests[0],props.events[0].guests[0]]])('does not count foreign or duplicated guest rows %j',guests=>{
  show({events:[{...props.events[0],guests}]});expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(screen.getByText(/have not been manufactured/)).toBeInTheDocument();
 });
});
