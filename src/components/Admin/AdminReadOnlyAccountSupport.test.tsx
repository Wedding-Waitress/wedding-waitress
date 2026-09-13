import { fireEvent,render,screen } from '@testing-library/react';
import { describe,it,expect,vi } from 'vitest';
import { AdminReadOnlyAccountDetails } from './AdminReadOnlyAccountDetails';
import { AdminReadOnlySupportHistory } from './AdminReadOnlySupportHistory';
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:()=>{throw Error('Customer auth forbidden');}},
  from:()=>{throw Error('Customer query forbidden');},rpc:()=>{throw Error('Writes forbidden');}}}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>{throw Error('Customer profile hook forbidden');}}));
const account={user_id:'owner',account_id:'AU-FIXTURE',name:'Élodie O’Connor',email:'old@example.test',mobile:null,
  login_email:'current@example.test',pending_email:'pending@example.test',email_confirmed_at:'2026-09-01T00:00:00Z',
  member_since:'2026-08-01T00:00:00Z',account_role:'master',marketing_preference:{status:'opted_in',consent_email:'current@example.test'}};
const ticket={id:'ticket',customer_id:'owner',event_id:null,full_name:'Élodie O’Connor',contact_email:'current@example.test',
  category:'General Help',message:'Actual saved enquiry\nSecond line <script>not HTML</script>',source:'get_help',status:'open',
  created_at:'2026-09-01T00:00:00Z',updated_at:'2026-09-02T00:00:00Z'};
describe('read-only account and support data',()=>{
  it('uses the shared account details display without authentication, editing or preference writes',()=>{
    render(<AdminReadOnlyAccountDetails ownerId="owner" customer={account}/>);
    expect(screen.getByText('Account Info')).toBeInTheDocument();expect(screen.getByText('Élodie O’Connor')).toBeInTheDocument();
    expect(screen.getByText('current@example.test')).toBeInTheDocument();expect(screen.getByText(/pending@example.test — awaiting verification/)).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();expect(screen.getByRole('checkbox')).toBeChecked();expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each([undefined,{...account,user_id:'foreign'},{...account,member_since:'invalid'},{...account,account_role:'admin'},
    {...account,marketing_preference:{status:'unknown',consent_email:'current@example.test'}}])('fails closed on missing, foreign or malformed account evidence',customer=>{
    render(<AdminReadOnlyAccountDetails ownerId="owner" customer={customer}/>);expect(screen.getByText(/Saved account details are unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('Élodie O’Connor')).not.toBeInTheDocument();
  });
  it('does not treat opt-in for an earlier email as current consent',()=>{
    render(<AdminReadOnlyAccountDetails ownerId="owner" customer={{...account,marketing_preference:{status:'opted_in',consent_email:'old@example.test'}}}/>);
    expect(screen.getByRole('checkbox')).not.toBeChecked();expect(screen.getByText(/Earlier opt-in does not establish consent/)).toBeInTheDocument();
  });
  it('distinguishes no record from a recorded opt-out',()=>{
    render(<AdminReadOnlyAccountDetails ownerId="owner" customer={{...account,marketing_preference:null}}/>);
    expect(screen.getByText('No marketing consent record.')).toBeInTheDocument();expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('renders saved linked enquiries as escaped text without sending or resolving them',()=>{
    const {container}=render(<AdminReadOnlySupportHistory ownerId="owner" tickets={[ticket]}/>);
    expect(screen.getByText('General Help — open')).toBeInTheDocument();expect(screen.getByText(/Actual saved enquiry/)).toHaveTextContent('<script>not HTML</script>');
    expect(container.querySelector('script')).toBeNull();expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/recorded ticket is not proof of email delivery/)).toBeInTheDocument();
  });
  it.each([undefined,[{...ticket,customer_id:'foreign'}],[{...ticket,status:'delivered'}],[{...ticket,created_at:'bad'}]])('does not invent or misattribute support history',tickets=>{
    render(<AdminReadOnlySupportHistory ownerId="owner" tickets={tickets}/>);expect(screen.getByText(/Saved support history is unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('General Help — open')).not.toBeInTheDocument();
  });
  it('shows every saved ticket using bounded read-only pages',()=>{
    render(<AdminReadOnlySupportHistory ownerId="owner" tickets={Array.from({length:31},(_,index)=>({...ticket,id:String(index),category:`Enquiry ${index}`}))}/>);
    expect(screen.getByText('Enquiry 0 — open')).toBeInTheDocument();expect(screen.queryByText('Enquiry 30 — open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByText('Enquiry 30 — open')).toBeInTheDocument();
    expect(screen.queryByText('Enquiry 0 — open')).not.toBeInTheDocument();
  });
});
