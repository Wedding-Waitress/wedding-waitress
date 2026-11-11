import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOtpModal } from './AdminOtpModal';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),navigate:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('react-router-dom',async original=>({...await original<typeof import('react-router-dom')>(),useNavigate:()=>mocks.navigate}));
const verificationCalls=()=>mocks.invoke.mock.calls.filter(([name])=>name==='admin-verify-otp');
const modal=(onOpenChange=vi.fn())=><MemoryRouter><AdminOtpModal open onOpenChange={onOpenChange}/></MemoryRouter>;
async function open(){const onOpenChange=vi.fn();const view=render(modal(onOpenChange));await screen.findByText(/1234/);return {view,onOpenChange,input:screen.getByLabelText('Six-digit verification code')};}
beforeEach(()=>{sessionStorage.clear();mocks.invoke.mockReset();mocks.navigate.mockReset();mocks.invoke.mockImplementation(name=>Promise.resolve(name==='admin-send-otp'?{data:{masked_phone:'***1234'},error:null}:{data:{grant:'grant',signature:'signature'},error:null}));});
afterEach(()=>{cleanup();vi.useRealTimers();});

describe('Admin Verification automatic submission',()=>{
 it('focuses the code input once SMS entry is ready and does not steal focus during normal typing or rerenders',async()=>{
  let finish!:(value:unknown)=>void;
  mocks.invoke.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const view=render(modal());const input=screen.getByLabelText('Six-digit verification code');
  expect(input).toBeDisabled();expect(input).not.toHaveFocus();
  await act(async()=>finish({data:{masked_phone:'***1234'}}));
  expect(input).toHaveFocus();fireEvent.change(input,{target:{value:'123'}});
  expect(input).toHaveFocus();
  const close=screen.getByRole('button',{name:'Close and return to Wedding Waitress'});close.focus();
  view.rerender(modal());expect(close).toHaveFocus();
  expect(mocks.invoke).toHaveBeenCalledTimes(1);expect(verificationCalls()).toHaveLength(0);
 });
 it('focuses the input again when the modal is closed and reopened',async()=>{
  const {view,input}=await open();expect(input).toHaveFocus();
  view.rerender(<MemoryRouter><AdminOtpModal open={false} onOpenChange={vi.fn()}/></MemoryRouter>);
  view.rerender(modal());await screen.findByText(/1234/);
  await waitFor(()=>expect(screen.getByLabelText('Six-digit verification code')).toHaveFocus());
  expect(mocks.invoke.mock.calls.filter(([name])=>name==='admin-send-otp')).toHaveLength(2);
 });
 it('returns focus for correction after an invalid verification response without automatically retrying',async()=>{
  let finish!:(value:unknown)=>void;
  mocks.invoke.mockImplementation(name=>name==='admin-send-otp'?Promise.resolve({data:{masked_phone:'***1234'}}):new Promise(resolve=>{finish=resolve;}));
  const {input}=await open();fireEvent.change(input,{target:{value:'111111'}});
  expect(input).toBeDisabled();
  await act(async()=>finish({data:{error:'Invalid code'}}));
  expect(input).toHaveFocus();expect(input).toHaveValue('111111');expect(verificationCalls()).toHaveLength(1);
 });
 it('waits for six typed digits, then navigates only after the server returns a signed grant',async()=>{
  let finish!:(value:unknown)=>void;
  mocks.invoke.mockImplementation(name=>name==='admin-send-otp'?Promise.resolve({data:{masked_phone:'***1234'}}):new Promise(resolve=>{finish=resolve;}));
  const {input,onOpenChange}=await open();
  for(const value of ['1','12','123','1234','12345'])fireEvent.change(input,{target:{value}});
  expect(verificationCalls()).toHaveLength(0);fireEvent.change(input,{target:{value:'123456'}});
  expect(verificationCalls()).toEqual([['admin-verify-otp',{body:{code:'123456'}}]]);
  expect(mocks.navigate).not.toHaveBeenCalled();expect(sessionStorage.getItem('ww_admin_grant')).toBeNull();
  await act(async()=>finish({data:{grant:'grant',signature:'signature'},error:null}));
  expect(sessionStorage.getItem('ww_admin_grant_sig')).toBe('signature');expect(onOpenChange).toHaveBeenCalledWith(false);expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/admin/overview');
 });
 it.each(['paste','autofill'])('submits a complete %s code without needing Verify',async(method)=>{
  const {input}=await open();
  expect(input).toHaveAttribute('autocomplete','one-time-code');
  if(method==='paste')fireEvent.paste(input,{clipboardData:{getData:()=> '12 34-56'}});
  else fireEvent.input(input,{target:{value:'123456'}});
  expect(input).toHaveValue('123456');
  await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledTimes(1));expect(verificationCalls()).toHaveLength(1);
 });
 it('keeps auto-submit and a concurrent manual Verify click single-flight, including repeated events',async()=>{
  let finish!:(value:unknown)=>void;
  mocks.invoke.mockImplementation(name=>name==='admin-send-otp'?Promise.resolve({data:{masked_phone:'***1234'}}):new Promise(resolve=>{finish=resolve;}));
  const {input,view}=await open();const verify=screen.getByRole('button',{name:'Verify'});
  fireEvent.change(input,{target:{value:'123456'}});fireEvent.click(verify);fireEvent.paste(input,{clipboardData:{getData:()=> '123456'}});view.rerender(modal());
  expect(verificationCalls()).toHaveLength(1);
  await act(async()=>finish({data:{error:'Invalid code'}}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);expect(mocks.navigate).not.toHaveBeenCalled();
 });
 it('does not automatically retry a failed code after rerenders or repeated paste, but verifies a corrected code',async()=>{
  mocks.invoke.mockImplementation((name,args)=>Promise.resolve(name==='admin-send-otp'?{data:{masked_phone:'***1234'}}:args.body.code==='111111'?{data:{error:'Invalid code'}}:{data:{grant:'grant',signature:'signature'}}));
  const {input,view}=await open();fireEvent.change(input,{target:{value:'111111'}});
  expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);
  view.rerender(modal());fireEvent.paste(input,{clipboardData:{getData:()=> '111111'}});
  expect(verificationCalls()).toHaveLength(1);expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'654321'}});await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledTimes(1));expect(verificationCalls()).toHaveLength(2);
 });
 it('retains an explicit manual retry after a failed automatic attempt',async()=>{
  mocks.invoke.mockImplementation(name=>Promise.resolve(name==='admin-send-otp'?{data:{masked_phone:'***1234'}}:{data:{error:'Invalid code'}}));
  const {input}=await open();fireEvent.change(input,{target:{value:'111111'}});await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Verify'}));await waitFor(()=>expect(verificationCalls()).toHaveLength(2));expect(mocks.navigate).not.toHaveBeenCalled();
 });
 it.each(['That code expired','Five attempts exceeded'])('preserves server rejection feedback for %s without navigation',async(error)=>{
  mocks.invoke.mockImplementation(name=>Promise.resolve(name==='admin-send-otp'?{data:{masked_phone:'***1234'}}:{data:{error}}));
  const {input}=await open();fireEvent.change(input,{target:{value:'111111'}});
  expect(await screen.findByRole('alert')).toHaveTextContent(error.includes('expired')?'That code has expired':error);expect(mocks.navigate).not.toHaveBeenCalled();expect(sessionStorage.getItem('ww_admin_grant')).toBeNull();
 });
 it('does not navigate for an incomplete grant or a network exception',async()=>{
  let calls=0;mocks.invoke.mockImplementation(name=>name==='admin-send-otp'?Promise.resolve({data:{masked_phone:'***1234'}}):++calls===1?Promise.resolve({data:{grant:'unsigned'}}):Promise.reject(new Error('Network')));
  const {input}=await open();fireEvent.change(input,{target:{value:'111111'}});await screen.findByRole('alert');
  expect(sessionStorage.getItem('ww_admin_grant')).toBeNull();fireEvent.change(input,{target:{value:'222222'}});
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not be confirmed/);expect(mocks.navigate).not.toHaveBeenCalled();
 });
 it('does not duplicate send or verification requests under Strict Mode',async()=>{
  const view=render(<StrictMode>{modal()}</StrictMode>);await screen.findByText(/1234/);
  fireEvent.change(screen.getByLabelText('Six-digit verification code'),{target:{value:'123456'}});
  await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledTimes(1));view.rerender(<StrictMode>{modal()}</StrictMode>);
  expect(mocks.invoke.mock.calls.filter(([name])=>name==='admin-send-otp')).toHaveLength(1);expect(verificationCalls()).toHaveLength(1);
 });
 it('retains the resend cooldown and can auto-submit a newly issued code',async()=>{
  mocks.invoke.mockImplementation(name=>Promise.resolve(name==='admin-send-otp'?{data:{masked_phone:'***1234'}}:{data:{error:'Invalid code'}}));
  vi.useFakeTimers();render(modal());await act(async()=>{});
  const input=screen.getByLabelText('Six-digit verification code');fireEvent.change(input,{target:{value:'111111'}});await act(async()=>{});
  expect(screen.getByRole('button',{name:/Resend Code in/})).toBeDisabled();
  await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});
  fireEvent.click(screen.getByRole('button',{name:'Resend Code'}));await act(async()=>{});
  expect(input).toHaveValue('');fireEvent.change(input,{target:{value:'111111'}});await act(async()=>{});
  expect(verificationCalls()).toHaveLength(2);
 });
 it('ignores a verification response after the popup is closed',async()=>{
  let finish!:(value:unknown)=>void;mocks.invoke.mockImplementation(name=>name==='admin-send-otp'?Promise.resolve({data:{masked_phone:'***1234'}}):new Promise(resolve=>{finish=resolve;}));
  const {input,view}=await open();fireEvent.change(input,{target:{value:'123456'}});view.rerender(<MemoryRouter><AdminOtpModal open={false} onOpenChange={vi.fn()}/></MemoryRouter>);
  await act(async()=>finish({data:{grant:'grant',signature:'signature'}}));expect(mocks.navigate).not.toHaveBeenCalled();expect(sessionStorage.getItem('ww_admin_grant')).toBeNull();
 });
});
