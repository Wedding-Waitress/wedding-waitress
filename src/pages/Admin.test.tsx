import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from './Admin';

const mocks=vi.hoisted(()=>({isAdmin:true,getSession:vi.fn(),signOut:vi.fn()}));
vi.mock('@/hooks/useIsAdmin',()=>({useIsAdmin:()=>({isAdmin:mocks.isAdmin,loading:false})}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>({profile:{first_name:'Nader',last_name:'Elalfy',email:'admin@example.com'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mocks.getSession,signOut:mocks.signOut}}}));
vi.mock('@/components/SEO/SeoHead',()=>({SeoHead:()=>null}));
vi.mock('@/components/Account/ProfileAvatar',()=>({ProfileAvatar:()=> <span>NE</span>}));
vi.mock('@/components/Admin/AdminCentrePages',()=>({AdminOverviewPage:()=> <div>Overview page</div>,AdminCustomersPage:()=> <div>Customers page</div>,AdminSubscriptionsPaymentsPage:()=> <div>Subscriptions page</div>,AdminEventsPage:()=> <div>Events page</div>,AdminAccountLifecyclePage:()=> <div>Lifecycle page</div>}));

const renderAdmin=(entry:string)=>{const router=createMemoryRouter([{path:'/admin',element:<Admin/>},{path:'/admin/:section',element:<Admin/>},{path:'/dashboard',element:<div>Wedding Waitress dashboard</div>},{path:'/',element:<div>Signed out</div>}],{initialEntries:[entry]});render(<RouterProvider router={router}/>);return router;};
describe('Admin Centre routing and protection',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.isAdmin=true;mocks.getSession.mockResolvedValue({data:{session:{user:{id:'admin-1'}}}});sessionStorage.setItem('ww_admin_grant',btoa(JSON.stringify({user_id:'admin-1',exp:Date.now()+600000})));sessionStorage.setItem('ww_admin_grant_sig','signed');});
  it('redirects /admin to the routed overview',async()=>{const router=renderAdmin('/admin');expect(await screen.findByText('Overview page')).toBeInTheDocument();expect(router.state.location.pathname).toBe('/admin/overview');});
  it('shows exactly five approved destinations and no removed Admin navigation',async()=>{renderAdmin('/admin/customers');expect(await screen.findByText('Customers page')).toBeInTheDocument();expect(screen.getAllByRole('link').filter(link=>link.getAttribute('href')?.startsWith('/admin/'))).toHaveLength(5);for(const removed of ['Invitations','Venues','Settings','Notifications','Logs','Feature Flags','Maintenance Mode'])expect(screen.queryByRole('link',{name:removed})).not.toBeInTheDocument();});
  it.each([['/admin/users','/admin/customers'],['/admin/subscriptions','/admin/subscriptions-payments'],['/admin/closed-accounts','/admin/account-lifecycle'],['/admin/logs','/admin/overview'],['/admin?tab=venues','/admin/customers']])('redirects legacy %s to %s',async(from,to)=>{const router=renderAdmin(from);await waitFor(()=>expect(router.state.location.pathname).toBe(to));});
  it('denies an ordinary user even with a forged browser grant',async()=>{mocks.isAdmin=false;renderAdmin('/admin/overview');expect(await screen.findByText('Wedding Waitress dashboard')).toBeInTheDocument();});
  it('requires the SMS verification grant before opening a route',async()=>{sessionStorage.clear();renderAdmin('/admin/events');expect(await screen.findByText('Wedding Waitress dashboard')).toBeInTheDocument();});
  it('keeps Back and Log Out separate',async()=>{renderAdmin('/admin/overview');await screen.findByText('Overview page');fireEvent.click(screen.getByRole('button',{name:'Log Out'}));await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());expect(await screen.findByText('Signed out')).toBeInTheDocument();});
});
