import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,it,expect,vi} from 'vitest';
import {SignUpModal} from './SignUpModal';
const m=vi.hoisted(()=>({send:vi.fn(),verify:vi.fn(),upsert:vi.fn(),update:vi.fn(),eq:vi.fn(),is:vi.fn(),invoke:vi.fn(),draft:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signInWithOtp:m.send,verifyOtp:m.verify},from:()=>({upsert:m.upsert,update:m.update}),functions:{invoke:m.invoke}}}));
vi.mock('@/lib/guidedEventSetup',()=>({beginGuidedSetup:m.draft}));
beforeEach(()=>{m.send.mockReset().mockResolvedValue({error:null});m.verify.mockReset().mockImplementation(async()=>({data:{user:{id:'new-owner',email:'alex@example.com',created_at:new Date().toISOString()}},error:null}));m.upsert.mockReset().mockResolvedValue({error:null});m.update.mockReset().mockReturnValue({eq:m.eq});m.eq.mockReset().mockReturnValue({is:m.is});m.is.mockReset().mockResolvedValue({error:null});m.invoke.mockReset().mockResolvedValue({data:{accepted:true},error:null});m.draft.mockReset().mockResolvedValue({});sessionStorage.clear();});
async function form(){render(<MemoryRouter><SignUpModal><button>Open signup</button></SignUpModal></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Open signup'}));for(const [label,value]of [['First name *','Alex'],['Last name *','Taylor'],['Email *','alex@example.com'],['Mobile *','0412345678']])fireEvent.change(await screen.findByLabelText(label),{target:{value}});return screen.getByLabelText('Country *');}
async function verify(){for(const [index,input]of (await screen.findAllByLabelText(/Verification code digit/)).entries())fireEvent.change(input,{target:{value:String(index+1)}});fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));}
it('requires a recognized country and provides native searchable choices including Australia',async()=>{
 const input=await form();expect(input).toHaveAttribute('autocomplete','country-name');expect(input).toHaveAttribute('required');
 expect(screen.queryByLabelText('Promo code (optional)')).not.toBeInTheDocument();const list=document.getElementById(input.getAttribute('list')!)!;expect(list.querySelector('option[label]')).toBeNull();expect(within(list).getAllByRole('option',{hidden:true})).toHaveLength(249);
 fireEvent.change(input,{target:{value:'Aus'}});fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));expect(await screen.findByRole('alert')).toHaveTextContent('Choose a country from the list.');expect(m.send).not.toHaveBeenCalled();
 fireEvent.change(input,{target:{value:'Australia'}});fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));await screen.findByRole('heading',{name:'Check your email'});
 expect(m.send).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({data:expect.objectContaining({country_code:'AU'})})}));
 expect(m.update).not.toHaveBeenCalled();await verify();await waitFor(()=>expect(m.update).toHaveBeenCalledWith({country_code:'AU'}));expect(m.eq).toHaveBeenCalledWith('id','new-owner');expect(m.is).toHaveBeenCalledWith('country_code',null);expect(m.upsert.mock.calls[0][0]).not.toHaveProperty('country_code');
});
it('retries country saving without consuming another email verification code',async()=>{
 m.is.mockResolvedValueOnce({error:{message:'Temporary save failure'}});const input=await form();fireEvent.change(input,{target:{value:'New Zealand'}});fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));await verify();
 expect(await screen.findByRole('alert')).toHaveTextContent('Your details could not be saved. Please try again.');expect(m.verify).toHaveBeenCalledTimes(1);expect(m.draft).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Verify Code'}));await waitFor(()=>expect(m.draft).toHaveBeenCalledTimes(1));expect(m.verify).toHaveBeenCalledTimes(1);expect(m.update).toHaveBeenLastCalledWith({country_code:'NZ'});
});
it('never saves a country or creates a profile after a rejected verification code',async()=>{
 m.verify.mockResolvedValue({data:{user:null},error:{message:'Invalid token'}});const input=await form();fireEvent.change(input,{target:{value:'Australia'}});fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));await verify();expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect');expect(m.upsert).not.toHaveBeenCalled();expect(m.update).not.toHaveBeenCalled();
});
it('clears the completed verification and country selection before another signup opens',async()=>{
 const input=await form();fireEvent.change(input,{target:{value:'Australia'}});fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));await verify();await waitFor(()=>expect(m.draft).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByRole('button',{name:'Open signup'}));expect(await screen.findByLabelText('Country *')).toHaveValue('');expect(screen.getByLabelText('First name *')).toHaveValue('');
});
