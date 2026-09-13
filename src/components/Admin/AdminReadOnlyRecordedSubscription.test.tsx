import {render,screen} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
vi.mock('@/hooks/useUserPlan',()=>({useUserPlan:()=>{throw Error('Customer plan hook forbidden');}}));
vi.mock('@/hooks/useAccountBilling',()=>({useAccountBilling:()=>{throw Error('Stripe portal request forbidden');}}));
import {AdminReadOnlyRecordedSubscription} from './AdminReadOnlyRecordedSubscription';
const saved={user_id:'owner',plan_name:'Essential',status:'active',started_at:'2026-01-01T00:00:00Z',expires_at:'2027-01-01T00:00:00Z',download_only_ends_at:null,is_read_only:false,guest_limit:100,included_events:1};
describe('recorded subscription, without billing operations',()=>{
 it('renders actual stored dates and limits without purchase, invoice or portal actions',()=>{
  render(<AdminReadOnlyRecordedSubscription ownerId="owner" subscription={saved}/>);
  expect(screen.getByText('Essential')).toBeInTheDocument();expect(screen.getByText('100')).toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it('does not invent a trial or paid plan for an absent subscription',()=>{
  render(<AdminReadOnlyRecordedSubscription ownerId="owner" subscription={null}/>);expect(screen.getByText(/A free trial or paid plan has not been inferred/)).toBeInTheDocument();
 });
 it.each([undefined,{...saved,user_id:'foreign'},{...saved,status:'paid'},{...saved,expires_at:'bad'},{...saved,guest_limit:-1}])('fails closed for incomplete or foreign records (%j)',subscription=>{
  render(<AdminReadOnlyRecordedSubscription ownerId="owner" subscription={subscription}/>);expect(screen.getByRole('alert')).toHaveTextContent('Complete owned subscription information is unavailable.');
 });
});
