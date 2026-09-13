import {render,screen} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:new Proxy({},{get(){throw Error('Customer authentication forbidden');}})}));
import {AdminReadOnlyAccountSecurity} from './AdminReadOnlyAccountSecurity';
const customer={user_id:'owner',login_email:'fixture@example.test',member_since:'2026-01-01T00:00:00Z',email_confirmed_at:'2026-01-02T00:00:00Z'};
describe('read-only account verification',()=>{
 it('shows recorded verification without exposing passwords or mounting actions',()=>{
  render(<AdminReadOnlyAccountSecurity ownerId="owner" customer={customer}/>);
  expect(screen.getByText('Verified')).toBeInTheDocument();expect(screen.getByText('Private — not available to administrators')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 });
 it('distinguishes an actual unverified account',()=>{
  render(<AdminReadOnlyAccountSecurity ownerId="owner" customer={{...customer,email_confirmed_at:null}}/>);expect(screen.getByText('Not Verified')).toBeInTheDocument();
 });
 it('does not infer unverified status when Auth history is unavailable',()=>{
  render(<AdminReadOnlyAccountSecurity ownerId="owner" customer={{...customer,member_since:null,email_confirmed_at:null}}/>);expect(screen.getByText('Unavailable')).toBeInTheDocument();expect(screen.queryByText('Not Verified')).not.toBeInTheDocument();
 });
 it.each([null,{...customer,user_id:'foreign'},{...customer,email_confirmed_at:'bad-date'}])('rejects missing, foreign or malformed history (%j)',customer=>{
  render(<AdminReadOnlyAccountSecurity ownerId="owner" customer={customer}/>);expect(screen.getByText('Saved account security status is unavailable.')).toBeInTheDocument();
 });
});
