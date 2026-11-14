import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {sendPlatformSms} from '../../supabase/functions/_shared/platformSms';
const fetcher=vi.fn();
beforeEach(()=>{fetcher.mockReset();vi.stubGlobal('fetch',fetcher);vi.stubGlobal('Deno',{env:{get:(name:string)=>({TWILIO_ACCOUNT_SID:'ACfixture',TWILIO_AUTH_TOKEN:'synthetic',TWILIO_PHONE_NUMBER:'+61400000000'}[name])}});});
afterEach(()=>vi.unstubAllGlobals());
describe('operational SMS acceptance classification',()=>{
 it('records an accepted provider identity',async()=>{fetcher.mockResolvedValue({ok:true,status:201,json:async()=>({sid:'SMfixture'})});expect(await sendPlatformSms('+61400000001','Synthetic')).toEqual({accepted:true,providerId:'SMfixture'});});
 it('classifies a definite client rejection as safe to retry',async()=>{fetcher.mockResolvedValue({ok:false,status:429,json:async()=>({code:20429})});expect(await sendPlatformSms('+61400000001','Synthetic')).toMatchObject({accepted:false,acceptanceUnknown:false});});
 it.each([{ok:false,status:503},{ok:true,status:201}])('holds ambiguous provider response %j',async response=>{fetcher.mockResolvedValue({...response,json:async()=>({})});expect(await sendPlatformSms('+61400000001','Synthetic')).toMatchObject({accepted:false,acceptanceUnknown:true});});
 it('holds network uncertainty',async()=>{fetcher.mockRejectedValue(Error('network'));expect(await sendPlatformSms('+61400000001','Synthetic')).toMatchObject({accepted:false,acceptanceUnknown:true});});
});
