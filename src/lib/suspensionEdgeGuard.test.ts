import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const slugs = ['create-checkout','create-extension-checkout','verify-payment','get-account-billing','manage-account-members','send-rsvp-email','send-rsvp-sms','send-invitation-email','guest-addition-sms-enrolment','send-venue-invitation','venue-floor-plan-request','floor-plan-share','djmc-pronunciation-media','delete-event-media','delete-guestbook-submission','fix-gallery-upload','gallery-live-feed','verify-gallery-password','generate-seating-suggestions','optimize-image','optimize-signage-image','send-transactional-email'];
const guardSource = readFileSync('supabase/functions/_shared/suspension-guard.ts','utf8');
function app(blocked: unknown = false, authError = false, rpcError = false) {
  const getUser = vi.fn(async () => ({data:{user:authError ? null : {id:'verified-customer'}},error:authError ? {message:'private'} : null}));
  const rpc = vi.fn(async () => ({data:blocked,error:rpcError ? {message:'private'} : null}));
  const client = vi.fn(() => ({auth:{getUser},rpc}));
  const source = guardSource.replace(/^import .*$/gm,'').replace('export async function','async function');
  const compiled = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const env:Record<string,string>={SUPABASE_URL:'https://isolated.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'};
  const guard = new Function('createClient','Deno',compiled+'\nreturn guardSuspendedCustomer;')(client,{env:{get:(key:string)=>env[key]}}) as (req:Request,options?:{allowEntitlementRecovery?:boolean})=>Promise<Response|null>;
  return {guard,client,getUser,rpc};
}
const token = `header.${btoa(JSON.stringify({role:'authenticated',sub:'forged-client-id'}))}.signature`;
const request = (value=token,method='POST') => new Request('https://isolated.test',{method,headers:{Authorization:`Bearer ${value}`}});
describe('customer Edge suspension boundary',()=>{
  it('checks verified identity rather than the unverified subject before permitting the existing handler',async()=>{
    const a=app();expect(await a.guard(request())).toBeNull();expect(a.getUser).toHaveBeenCalledWith(token);
    expect(a.rpc).toHaveBeenCalledWith('is_account_suspension_blocked',{p_user_id:'verified-customer'});
    expect(a.rpc).toHaveBeenCalledWith('is_customer_entitlement_blocked',{p_user_id:'verified-customer'});
  });
  it.each([true,null,undefined,1])('denies expired or unknown entitlement even without an admin hold (%s)',async(value)=>{
    const a=app();a.rpc.mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:value,error:null});
    expect((await a.guard(request()))?.status).toBe(403);
  });
  it('fails closed when the entitlement lookup fails without exposing database errors',async()=>{
    const a=app();a.rpc.mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:null,error:{message:'private'}});
    const result=await a.guard(request());expect(result?.status).toBe(503);expect(await result?.text()).not.toContain('private');
  });
  it('a billing-recovery option never bypasses an administrative hold',async()=>{
    const a=app(true);expect((await a.guard(request(),{allowEntitlementRecovery:true}))?.status).toBe(403);
    expect(a.rpc).not.toHaveBeenCalledWith('is_customer_entitlement_blocked',expect.anything());
  });
  it.each([true,null,undefined,1])('denies suspended or unknown access (%s)',async(value)=>{
    const a=app();a.rpc.mockResolvedValue({data:value,error:null});const result=await a.guard(request());expect(result?.status).toBe(403);
    expect(await result?.text()).not.toContain('private');
  });
  it('fails closed without querying access for an invalid user session',async()=>{
    const a=app(false,true);expect((await a.guard(request()))?.status).toBe(401);expect(a.rpc).not.toHaveBeenCalled();
  });
  it('fails closed when the live access lookup fails',async()=>{const a=app(false,false,true);expect((await a.guard(request()))?.status).toBe(503);});
  it('leaves preflight, genuine service requests and public keys to existing handler authorization',async()=>{
    const a=app();for(const req of [request(token,'OPTIONS'),request('fixture-service'),request('publishable-fixture')]) expect(await a.guard(req)).toBeNull();
    expect(a.client).not.toHaveBeenCalled();
  });
  it.each([...slugs,'create-welcome-video-upload','check-welcome-video-status','delete-welcome-video','classify-invitation-image'])('places the guard before privileged work in %s',slug=>{
    const source=readFileSync(`supabase/functions/${slug}/index.ts`,'utf8');
    expect(source).toContain("import { guardSuspendedCustomer }");
    if (slug === 'create-checkout') {
      expect(source).toContain('allowEntitlementRecovery: billingRecovery');
      expect(source.indexOf('const suspensionResponse =')).toBeLessThan(source.indexOf('const supabaseClient = createClient'));
      expect(source).toContain('isVerifiedClosedRenewalDecision(decision)');
    } else {
      expect(source).toMatch(/serve\(async\s*\(?\s*\w+(?:\s*:\s*Request)?\s*\)?\s*=>\s*\{\s*const suspensionResponse = await guardSuspendedCustomer\(\w+(?:,\s*\{\s*allowEntitlementRecovery:\s*true\s*\})?\);\s*if \(suspensionResponse\) return suspensionResponse;/);
    }
  });
});
