import { webcrypto } from 'node:crypto';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { verifyCleanupGrant } from '../../supabase/functions/_shared/designatedCleanupGrant';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>vi.unstubAllGlobals());
async function signed(user='owner',exp=2000) {
  const admin_grant=btoa(JSON.stringify({user_id:user,exp}));
  const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(`${admin_grant}|fixture-secret`));
  return {admin_grant,admin_grant_signature:Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')};
}
it('accepts exact unexpired signed owner grant',async()=>expect(verifyCleanupGrant(await signed(),'owner','fixture-secret',1000)).resolves.toBeUndefined());
it('rejects another owner grant',async()=>expect(verifyCleanupGrant(await signed('other'),'owner','fixture-secret',1000)).rejects.toThrow());
it('rejects expiry at current time',async()=>expect(verifyCleanupGrant(await signed('owner',1000),'owner','fixture-secret',1000)).rejects.toThrow());
it('rejects tampered signature',async()=>expect(verifyCleanupGrant({...await signed(),admin_grant_signature:'0'.repeat(64)},'owner','fixture-secret',1000)).rejects.toThrow());
it('rejects wrong service secret',async()=>expect(verifyCleanupGrant(await signed(),'owner','wrong-secret',1000)).rejects.toThrow());
it('rejects missing verification',async()=>expect(verifyCleanupGrant({},'owner','fixture-secret',1000)).rejects.toThrow());
