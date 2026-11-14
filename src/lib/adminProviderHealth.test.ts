import { describe, expect, it, vi } from 'vitest';
import { readAdminProviderHealth } from '../../supabase/functions/_shared/adminProviderHealth';
const root='https://isolated.test',sid='AC'+'1'.repeat(32);
const env=(patch:Record<string,string>={})=>(key:string)=>({SUPABASE_URL:root,RESEND_API_KEY:'fixture-email-key',TWILIO_ACCOUNT_SID:sid,TWILIO_AUTH_TOKEN:'fixture-sms-secret',...patch}[key]);
const events=['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed'];
function fixture(patch:{domain?:unknown;hooks?:unknown;sms?:unknown;domainStatus?:number}={}){
 return vi.fn(async(url:string,options:RequestInit)=>{
  expect(options.method).toBe('GET');expect(options.redirect).toBe('error');expect(options.signal).toBeInstanceOf(AbortSignal);
  const data=url.includes('/domains')?patch.domain??{data:[{name:'weddingwaitress.com.au',status:'verified'}],has_more:false}:url.includes('/webhooks')?patch.hooks??{data:[{status:'enabled',endpoint:root+'/functions/v1/email-delivery-webhook',events}],has_more:false}:patch.sms??{status:'active',auth_token:'provider-secret-must-not-leak'};
  return new Response(JSON.stringify(data),{status:url.includes('/domains')?patch.domainStatus??200:200});
 });
}
describe('admin read-only provider health checks',()=>{
 it('checks exact providers and webhook events without returning any provider secrets',async()=>{const send=fixture(),result=await readAdminProviderHealth(env(),send as typeof fetch);expect(result.checks.email_provider.state).toBe('verified');expect(result.checks.email_webhook.state).toBe('verified');expect(result.checks.sms_provider.state).toBe('verified');expect(result.checks.stripe_reporting.state).toBe('missing');expect(send).toHaveBeenCalledTimes(3);expect(JSON.stringify(result)).not.toMatch(/fixture-email-key|fixture-sms-secret|provider-secret-must-not-leak|Accounts\/AC/);});
 it.each([401,403,429,500])('reports unavailable read access without inferring sending failure (%s)',async status=>{const result=await readAdminProviderHealth(env(),fixture({domainStatus:status}) as typeof fetch);expect(result.checks.email_provider.state).not.toBe('verified');expect(result.checks.email_webhook.state).toBe('unknown');});
 it('does not infer complete registration from disabled, incomplete or foreign endpoints',async()=>{for(const hook of [{status:'disabled',endpoint:root+'/functions/v1/email-delivery-webhook',events},{status:'enabled',endpoint:root+'/functions/v1/email-delivery-webhook',events:['email.sent']},{status:'enabled',endpoint:'https://other.test/hook',events}]){const result=await readAdminProviderHealth(env(),fixture({hooks:{data:[hook],has_more:false}}) as typeof fetch);expect(result.checks.email_webhook.state).not.toBe('verified');}});
 it('reports truncated or malformed provider lists as unknown',async()=>{for(const response of [{data:[],has_more:true},{}]){const result=await readAdminProviderHealth(env(),fixture({domain:response,hooks:response}) as typeof fetch);expect(result.checks.email_provider.state).toBe('unknown');expect(result.checks.email_webhook.state).toBe('unknown');}});
 it('does not make requests with absent credentials or fall back to the general Stripe key',async()=>{const send=vi.fn();const result=await readAdminProviderHealth(name=>name==='STRIPE_SECRET_KEY'?'forbidden-general-key':undefined,send);expect(send).not.toHaveBeenCalled();expect(result.checks.stripe_reporting.state).toBe('missing');expect(result.checks.email_provider.state).toBe('missing');});
 it('sanitizes connectivity errors',async()=>{const result=await readAdminProviderHealth(env(),vi.fn(async()=>{throw Error('fixture-sms-secret');}));expect(result.checks.email_provider.state).toBe('unreachable');expect(result.checks.sms_provider.state).toBe('unreachable');expect(JSON.stringify(result)).not.toContain('fixture-sms-secret');});
});
