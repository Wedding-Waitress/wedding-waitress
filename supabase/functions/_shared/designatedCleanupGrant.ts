export async function verifyCleanupGrant(body: Record<string, unknown>, userId: string, service: string, now = Date.now()) {
  if(typeof body.admin_grant!=='string'||typeof body.admin_grant_signature!=='string'||!service)throw new Error('Recent admin verification required');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${body.admin_grant}|${service}`));
  const expected=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const supplied=body.admin_grant_signature;
  if(supplied.length!==expected.length||[...expected].reduce((diff,c,i)=>diff|(c.charCodeAt(0)^supplied.charCodeAt(i)),0)!==0)throw new Error('Admin verification required');
  const grant=JSON.parse(atob(body.admin_grant));
  if(grant.user_id!==userId||typeof grant.exp!=='number'||!Number.isFinite(grant.exp)||grant.exp<=now)throw new Error('Admin verification expired');
}
