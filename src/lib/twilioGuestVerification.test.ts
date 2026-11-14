import { expect, it, vi } from 'vitest';
import { createGuestVerifyProvider, GuestVerifyProviderError } from '../../supabase/functions/_shared/twilio-guest-verification';

const accountSid='AC'+'a'.repeat(32), serviceSid='VA'+'b'.repeat(32), reference='VE'+'c'.repeat(32);
const config={accountSid,serviceSid,authToken:'fictional-auth-token-for-tests-only'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const pending=()=>({sid:reference,service_sid:serviceSid,status:'pending',to:'+61400000001',channel:'sms'});

it('fails closed before network access when service credentials are missing or malformed',()=>{
  const fetcher=vi.fn();expect(()=>createGuestVerifyProvider({...config,serviceSid:''},fetcher)).toThrow(GuestVerifyProviderError);expect(fetcher).not.toHaveBeenCalled();
});
it('checks the configured six-digit service without sending a message',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({sid:serviceSid,code_length:6}));expect(await createGuestVerifyProvider(config,fetcher).checkService()).toEqual({available:true,codeLength:6});
  expect(fetcher.mock.calls[0][0]).toBe('https://verify.twilio.com/v2/Services/'+serviceSid);expect(fetcher.mock.calls[0][1]).toMatchObject({method:'GET',redirect:'error'});expect(fetcher.mock.calls[0][1]).not.toHaveProperty('body');
});
it('rejects a service configured for a different code length',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({sid:serviceSid,code_length:4}));await expect(createGuestVerifyProvider(config,fetcher).checkService()).rejects.toMatchObject({code:'configuration'});
});
it('sends once to the normalised recorded number with no custom message or code override',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response(pending(),201));expect(await createGuestVerifyProvider(config,fetcher).start('0400 000 001')).toEqual({reference,state:'pending'});
  expect(fetcher).toHaveBeenCalledTimes(1);const fields=new URLSearchParams(fetcher.mock.calls[0][1].body);expect([...fields.entries()]).toEqual([['To','+61400000001'],['Channel','sms']]);
});
it('does not contact the provider for a missing or ambiguous phone',async()=>{
  const fetcher=vi.fn();await expect(createGuestVerifyProvider(config,fetcher).start('')).rejects.toMatchObject({code:'invalid_target'});expect(fetcher).not.toHaveBeenCalled();
});
it('checks only the server-stored verification reference and the submitted code',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...pending(),status:'approved',valid:true}));expect(await createGuestVerifyProvider(config,fetcher).check(reference,'000123','+61400000001')).toBe(true);
  const fields=new URLSearchParams(fetcher.mock.calls[0][1].body);expect([...fields.entries()]).toEqual([['VerificationSid',reference],['Code','000123']]);expect(fetcher.mock.calls[0][0]).toMatch(/\/VerificationCheck$/);
});
it('does not approve pending, invalid, expired or malformed codes',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...pending(),valid:false}));const provider=createGuestVerifyProvider(config,fetcher);expect(await provider.check(reference,'123456','+61400000001')).toBe(false);expect(await provider.check(reference,'12345','+61400000001')).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue(response({},404));expect(await provider.check(reference,'123456','+61400000001')).toBe(false);
});
it('rejects an approved response bound to another destination or service',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...pending(),status:'approved',valid:true,to:'+61400000002'}));await expect(createGuestVerifyProvider(config,fetcher).check(reference,'123456','+61400000001')).rejects.toMatchObject({code:'unavailable'});
});
it('does not retry or expose provider payloads after rejection',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({message:'Private recipient and secret must not be propagated'},400));await expect(createGuestVerifyProvider(config,fetcher).start('+61400000001')).rejects.toMatchObject({code:'rejected',acceptanceUnknown:false,message:'Guest verification provider: rejected'});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('distinguishes rate limits and invalid provider credentials without retrying',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({},429));const provider=createGuestVerifyProvider(config,fetcher);await expect(provider.start('+61400000001')).rejects.toMatchObject({code:'rate_limited',acceptanceUnknown:false});fetcher.mockResolvedValue(response({},401));await expect(provider.start('+61400000001')).rejects.toMatchObject({code:'configuration',acceptanceUnknown:false});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('flags ambiguous send failures so callers retain credit reservation pending reconciliation',async()=>{
  const fetcher=vi.fn().mockRejectedValue(new Error('Network interruption'));await expect(createGuestVerifyProvider(config,fetcher).start('+61400000001')).rejects.toMatchObject({code:'unavailable',acceptanceUnknown:true});expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue(new Response('not-json',{status:201}));await expect(createGuestVerifyProvider(config,fetcher).start('+61400000001')).rejects.toMatchObject({acceptanceUnknown:true});
});
it('flags mismatched or malformed successful send responses as ambiguous, not refundable rejection',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...pending(),sid:'wrong'},201));await expect(createGuestVerifyProvider(config,fetcher).start('+61400000001')).rejects.toMatchObject({code:'unavailable',acceptanceUnknown:true});
});
