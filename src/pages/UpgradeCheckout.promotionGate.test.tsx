import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { UpgradeCheckout } from './UpgradeCheckout';
const mocks = vi.hoisted(() => ({ invoke:vi.fn(), getSession:vi.fn(), getUser:vi.fn(), toast:vi.fn(), startProcessing:vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({supabase:{auth:{getSession:mocks.getSession,getUser:mocks.getUser},functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/contexts/PaymentProcessingContext',()=>({usePaymentProcessing:()=>({processing:false,startProcessing:mocks.startProcessing})}));
vi.mock('@/lib/packagePricing', async original=>({...await original<any>(),PACKAGE_CHECKOUT_AVAILABLE:false}));
vi.mock('@/lib/promotionCheckoutAvailability',async original=>({...await original<any>(),PROMOTION_CHECKOUT_AVAILABLE:true}));
vi.mock('@/components/SEO/SeoHead',()=>({SeoHead:()=>null}));
vi.mock('@stripe/stripe-js',()=>({loadStripe:vi.fn(async()=>null)}));
vi.mock('@stripe/react-stripe-js',()=>({EmbeddedCheckoutProvider:({children}:any)=>children,EmbeddedCheckout:()=> <p>Verified promotion checkout</p>}));
const show=(url='/upgrade-checkout?plan=essential')=>render(<MemoryRouter initialEntries={[url]}><UpgradeCheckout/></MemoryRouter>);
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.getUser.mockResolvedValue({data:{user:null}});
 mocks.getSession.mockResolvedValue({data:{session:{access_token:'isolated-session'}}});
 mocks.invoke.mockResolvedValue({data:{client_secret:'isolated-secret',publishable_key:'pk_test_Fixture',checkout_quote:{currency:'AUD',amount:9950},promotion:{percent_off:50,included_credits:150}},error:null});
});
it('enables only coded first purchase after explicit consent while normal checkout remains closed',async()=>{
 show();
 expect(screen.queryByRole('button',{name:'I agree — continue to checkout'})).not.toBeInTheDocument();
 expect(mocks.invoke).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Promo code (optional)'),{target:{value:'OFFER50'}});
 expect(screen.getByRole('heading',{name:'Confirm Essential Plan checkout'})).toBeInTheDocument();
 expect(mocks.invoke).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'I agree — continue to checkout'})).toBeDisabled();
 mocks.invoke.mockResolvedValueOnce({data:{success:true,quote:{code:'OFFER50',plan_key:'essential',percent_off:50,currency:'AUD',subtotal_cents:9950,included_credits:150}},error:null});
 fireEvent.click(screen.getByRole('button',{name:'Check offer'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'I agree — continue to checkout'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'I agree — continue to checkout'}));
 await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(2));
 expect(mocks.invoke).toHaveBeenCalledWith('create-promotion-checkout',expect.objectContaining({body:expect.objectContaining({promo_code:'OFFER50',purchase_consent:true,plan_purchase_purpose:'new_plan'})}));
 expect(await screen.findByText('Verified promotion checkout')).toBeInTheDocument();
});
it.each(['/upgrade-checkout?plan=essential&purpose=renewal','/upgrade-checkout?plan=premium&from=essential'])('keeps unrelated checkout unavailable at %s', url=>{
 show(url);
 expect(screen.queryByRole('button',{name:'I agree — continue to checkout'})).not.toBeInTheDocument();
 expect(mocks.getSession).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
});

it('does not show payment controls when checkout differs from the reviewed promo',async()=>{
 show();fireEvent.change(screen.getByLabelText('Promo code (optional)'),{target:{value:'OFFER60'}});
 mocks.invoke.mockResolvedValueOnce({data:{success:true,quote:{code:'OFFER60',plan_key:'essential',percent_off:60,currency:'AUD',subtotal_cents:7960,included_credits:0}},error:null});
 fireEvent.click(screen.getByRole('button',{name:'Check offer'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'I agree — continue to checkout'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'I agree — continue to checkout'}));
 await screen.findByText('The offer changed. Return to your package selection and check your promo code again before paying.');
 expect(screen.queryByText('Verified promotion checkout')).not.toBeInTheDocument();
});
