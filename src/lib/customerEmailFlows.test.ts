import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { stableEmailMessageId, supportRateKey } from '../../supabase/functions/_shared/customer-email-data';

// Evaluate the actual Edge handler with injected services; no network, messages,
// production users or provider side effects. Deno deployment remains separate QA.
function loadHandler(path: string, services: Record<string, unknown>, env: Record<string, string>) {
  let handler: (req: Request) => Promise<Response>;
  const guard = readFileSync('supabase/functions/_shared/suspension-guard.ts', 'utf8').replace(/^import .*$/gm, '').replace('export async function', 'async function');
  const source = guard + '\n' + readFileSync(path, 'utf8').replace(/^import .*$/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const deno = { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } };
  new Function('Deno', ...Object.keys(services), compiled)(deno, ...Object.values(services));
  return handler!;
}
const env = { SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', TRANSACTIONAL_EMAIL_PROCESSOR_SECRET: 'test-processor-key' };
function sender(user: {id:string;email:string} | null, processor=true) {
  const records: Array<Record<string, unknown>> = [];
  const rpc = vi.fn(async (name: string) => ({ data: name === 'create_support_ticket' ? 'ticket-test' : 1, error: null }));
  const admin = { auth: { getUser: vi.fn(async () => ({ data: { user } })) }, rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async (row: Record<string, unknown>) => { records.push(row); return {error:null}; } }),
    functions: { invoke: vi.fn(async () => ({ data: { success: true, accepted: true }, error: null })) } };
  const templates = { 'contact-form-message': { to:'support@example.test', component: ()=>null, subject:'Support' }, welcome: { component:()=>null,subject:'Welcome' }, 'admin-new-signup':{to:'support@example.test',component:()=>null,subject:'Signup'} };
  const handler = loadHandler('supabase/functions/send-transactional-email/index.ts', { createClient:()=>admin,
    TEMPLATES:templates, stableEmailMessageId, supportRateKey, React:{createElement:()=>null}, renderAsync:async()=>'<p>Message</p>' },
    processor ? env : {...env,TRANSACTIONAL_EMAIL_PROCESSOR_SECRET:''});
  return {handler,rpc,records,admin};
}
const request = (body: Record<string, unknown>, token='test-user-token') => new Request('https://example.test/send', {
  method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),
});
const support = {templateName:'contact-form-message', idempotencyKey:'request-test',templateData:{name:'Alice',email:'alice@example.test',message:'Please help',eventType:'Wedding'}};
describe('wired customer and email flows',()=>{
  it('persists public contact without equating contact email to an account identity',async()=>{
    const app=sender(null);const response=await app.handler(request({...support, customerId:'forged'}));expect(response.status).toBe(200);
    expect(app.rpc).toHaveBeenCalledWith('create_support_ticket',expect.objectContaining({p_customer_id:null,p_source:'public_contact'}));
    expect(await response.json()).toMatchObject({accepted:true,delivered:false,ticketId:'ticket-test'});
  });
  it('derives authenticated support identity and event linkage from verified caller',async()=>{
    const app=sender({id:'alice',email:'alice@example.test'});await app.handler(request({...support,supportContext:{source:'get_help',category:'General Help',eventId:'event-test'}}));
    expect(app.rpc).toHaveBeenCalledWith('create_support_ticket',expect.objectContaining({p_customer_id:'alice',p_event_id:'event-test'}));
    expect(app.records[0]).toMatchObject({customer_id:'alice',event_id:'event-test',support_ticket_id:'ticket-test'});
    expect(app.records[0]).not.toHaveProperty('html');expect(app.records[0]).not.toHaveProperty('message');
  });
  it('retains support ticket if email delivery is not configured',async()=>{
    const app=sender(null,false);const response=await app.handler(request(support));
    expect(await response.json()).toMatchObject({success:true,recorded:true,accepted:false,delivered:false});
    expect(app.admin.functions.invoke).not.toHaveBeenCalled();
  });
  it('denies impersonated account support and arbitrary recipient welcome messages',async()=>{
    const anon=sender(null);expect((await anon.handler(request({...support,supportContext:{source:'get_help'}}))).status).toBe(401);
    expect(anon.rpc).not.toHaveBeenCalled();
    const app=sender({id:'alice',email:'alice@example.test'});expect((await app.handler(request({templateName:'welcome',recipientEmail:'bob@example.test'}))).status).toBe(403);
  });
  it('does not enable promotional sending or inferred consent',async()=>{
    const app=sender({id:'alice',email:'alice@example.test'});expect((await app.handler(request({...support,purpose:'promotional'}))).status).toBe(403);
    expect(app.rpc).not.toHaveBeenCalled();
  });
  it('rejects invalid webhook signatures before any database call',async()=>{
    const database=vi.fn();class InvalidWebhook {verify(){throw new Error('Invalid signature');}}
    const handler=loadHandler('supabase/functions/email-delivery-webhook/index.ts',{createClient:database,Webhook:InvalidWebhook},{...env,RESEND_WEBHOOK_SECRET:'test-signing-secret'});
    expect((await handler(request({type:'email.delivered'}))).status).toBe(401);expect(database).not.toHaveBeenCalled();
  });
  it('records only allowlisted metadata from verified provider delivery event',async()=>{
    const rpc=vi.fn(async()=>({data:true,error:null}));class VerifiedWebhook {verify(){/* Svix 2.5 verifies successfully without returning parsed JSON. */}}
    const handler=loadHandler('supabase/functions/email-delivery-webhook/index.ts',{createClient:()=>({rpc}),Webhook:VerifiedWebhook},{...env,RESEND_WEBHOOK_SECRET:'test-signing-secret'});
    const req=new Request('https://example.test/webhook',{method:'POST',headers:{'svix-id':'event-test'},body:JSON.stringify({type:'email.delivered',created_at:'2026-09-12T00:00:00Z',data:{email_id:'provider-test',html:'private body',otp:'private code'}})});
    expect((await handler(req)).status).toBe(200);expect(rpc).toHaveBeenCalledWith('record_email_delivery_event',{p_provider_event_id:'event-test',p_message_id:'provider-test',p_type:'email.delivered',p_occurred_at:'2026-09-12T00:00:00Z'});
  });
});
