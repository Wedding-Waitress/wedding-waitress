import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from './Admin';

const mocks=vi.hoisted(()=>({isAdmin:true,getSession:vi.fn(),signOut:vi.fn()}));
vi.mock('@/hooks/useIsAdmin',()=>({useIsAdmin:()=>({isAdmin:mocks.isAdmin,loading:false})}));
vi.mock('@/hooks/useDashboardSession',()=>({useDashboardSession:()=>({session:{user:{id:'admin-1'}},loading:false,error:null,retry:vi.fn()})}));
vi.mock('@/hooks/useProfile',()=>({useProfile:()=>({profile:{first_name:'Nader',last_name:'Elalfy',email:'admin@example.com'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mocks.getSession,signOut:mocks.signOut}}}));
vi.mock('@/components/SEO/SeoHead',()=>({SeoHead:()=>null}));
vi.mock('@/components/Account/ProfileAvatar',()=>({ProfileAvatar:()=> <span>NE</span>}));
vi.mock('@/components/Admin/AdminCentrePages',()=>({AdminOverviewPage:()=> <div>Overview page</div>,AdminCustomersPage:()=> <div>Customers page</div>,AdminSubscriptionsPaymentsPage:()=> <div>Subscriptions page</div>,AdminEventsPage:()=> <div>Events page</div>,AdminAccountLifecyclePage:()=> <div>Lifecycle page</div>}));
vi.mock('@/components/Admin/AdminOperationsPages',()=>({AdminSupportPage:()=> <div>Support page</div>,AdminMessagesCreditsPage:()=> <div>Messages page</div>,AdminSystemHealthPage:()=> <div>Health page</div>,AdminActivityPage:()=> <div>Activity page</div>}));

const renderAdmin=(entry:string)=>{const router=createMemoryRouter([{path:'/admin/:section?',element:<Admin/>},{path:'/dashboard',element:<div>Wedding Waitress dashboard</div>},{path:'/',element:<div>Signed out</div>}],{initialEntries:[entry]});render(<RouterProvider router={router}/>);return router;};
describe('Admin Centre routing and protection',()=>{
  it('redirects the former Admin Events route to consolidated customer event details',async()=>{
    const router=renderAdmin('/admin/events');
    expect(await screen.findByText('Customers page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/customers');
    expect(router.state.location.hash).toBe('#customer-events');
    expect(screen.queryByRole('link',{name:'Events'})).not.toBeInTheDocument();
  });
  beforeEach(()=>{vi.clearAllMocks();mocks.isAdmin=true;mocks.getSession.mockResolvedValue({data:{session:{user:{id:'admin-1'}}}});sessionStorage.setItem('ww_admin_grant',btoa(JSON.stringify({user_id:'admin-1',exp:Date.now()+600000})));sessionStorage.setItem('ww_admin_grant_sig','signed');});
  it('redirects /admin to the routed overview',async()=>{const router=renderAdmin('/admin');expect(await screen.findByText('Overview page')).toBeInTheDocument();expect(router.state.location.pathname).toBe('/admin/overview');});
  it('consolidates Admin Events into Customers and preserves the other approved destinations',async()=>{renderAdmin('/admin/customers');expect(await screen.findByText('Customers page')).toBeInTheDocument();expect(screen.getAllByRole('link').filter(link=>link.getAttribute('href')?.startsWith('/admin/'))).toHaveLength(8);for(const added of ['Support','Messages & Credits','System Health','Admin Activity'])expect(screen.getByRole('link',{name:added})).toBeInTheDocument();for(const removed of ['Events','Invitations','Venues','Settings','Notifications','Logs','Feature Flags','Maintenance Mode'])expect(screen.queryByRole('link',{name:removed})).not.toBeInTheDocument();});
  it.each([['support','Support page'],['messages-credits','Messages page'],['system-health','Health page'],['admin-activity','Activity page']])('opens approved %s route under the same owner gate',async(section,title)=>{renderAdmin('/admin/'+section);expect(await screen.findByText(title)).toBeInTheDocument();});
  it.each([['/admin/users','/admin/customers'],['/admin/subscriptions','/admin/subscriptions-payments'],['/admin/closed-accounts','/admin/account-lifecycle'],['/admin/logs','/admin/overview'],['/admin?tab=venues','/admin/customers']])('redirects legacy %s to %s',async(from,to)=>{const router=renderAdmin(from);await waitFor(()=>expect(router.state.location.pathname).toBe(to));});
  it('denies an ordinary user even with a forged browser grant',async()=>{mocks.isAdmin=false;renderAdmin('/admin/overview');expect(await screen.findByText('Wedding Waitress dashboard')).toBeInTheDocument();});
  it('requires the SMS verification grant before opening a route',async()=>{sessionStorage.clear();renderAdmin('/admin/events');expect(await screen.findByText('Wedding Waitress dashboard')).toBeInTheDocument();});
  it('keeps Back and Log Out separate',async()=>{renderAdmin('/admin/overview');await screen.findByText('Overview page');fireEvent.click(screen.getByRole('button',{name:'Log Out'}));await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());expect(await screen.findByText('Signed out')).toBeInTheDocument();});
  it('keeps the Admin Centre shell mounted while section content changes',async()=>{renderAdmin('/admin/overview');await screen.findByText('Overview page');const shell=document.querySelector('[data-admin-shell]');fireEvent.click(screen.getByRole('link',{name:'Customers'}));expect(screen.getByRole('link',{name:'Customers'})).toHaveAttribute('aria-current','page');expect(await screen.findByText('Customers page')).toBeInTheDocument();expect(document.querySelector('[data-admin-shell]')).toBe(shell);});
});
