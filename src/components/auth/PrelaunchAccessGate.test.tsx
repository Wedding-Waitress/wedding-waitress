import React from 'react';
import { describe,it,expect,vi,afterEach,beforeEach } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrelaunchAccessGate } from './PrelaunchAccessGate';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),listener:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,auth:{onAuthStateChange:mocks.listener}}}));
beforeEach(()=>{mocks.listener.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});});
afterEach(()=>{cleanup();vi.clearAllMocks();});
const open=()=>render(<MemoryRouter><PrelaunchAccessGate><p>Protected owner tools</p></PrelaunchAccessGate></MemoryRouter>);
describe('prelaunch route gate',()=>{
 it('allows only an affirmative server decision, preserving owner access',async()=>{mocks.rpc.mockResolvedValue({data:{enabled:true,allowed:true},error:null});open();expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();});
 it('blocks existing nonowner sessions without mounting planning tools',async()=>{mocks.rpc.mockResolvedValue({data:{enabled:true,allowed:false},error:null});open();expect(await screen.findByText('Account access is unavailable')).toBeInTheDocument();expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();});
 it.each([{data:null,error:null},{data:{allowed:'true'},error:null},{data:{allowed:true},error:{message:'private'}}])('fails closed on uncertain responses',async result=>{mocks.rpc.mockResolvedValue(result);open();expect(await screen.findByText('Access could not be verified')).toBeInTheDocument();expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();});
 it('restores normal routing only after the server launch switch is released',async()=>{mocks.rpc.mockResolvedValue({data:{enabled:false,allowed:true},error:null});open();expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();});
});
