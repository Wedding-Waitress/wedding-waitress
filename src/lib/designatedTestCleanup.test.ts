import { expect, it, vi } from 'vitest';
import { inspect, targets, verifyTarget } from '../../scripts/designated-test-event-cleanup.mjs';
it('accepts only exact immutable approved identities',()=>{
  for(const target of targets) expect(()=>verifyTarget({...target,event_image_path:null},target)).not.toThrow();
  expect(Object.isFrozen(targets)).toBe(true);
  expect(()=>verifyTarget({...targets[0]}, {...targets[0]})).toThrow('Unapproved target');
});
for(const field of ['id','event_id','name','user_id']) it(`rejects changed ${field}`,()=>{
  expect(()=>verifyTarget({...targets[0],[field]:'changed'},targets[0])).toThrow('Target identity mismatch');
});
it('fails closed for an attached image',()=>{
  expect(()=>verifyTarget({...targets[0],event_image_path:'owner/photo.jpg'},targets[0])).toThrow('Attachment');
});
it('fails closed for uncertain database results without mutation',async()=>{
  const client={from:vi.fn(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({error:{message:'uncertain'},data:null})})})}))};
  await expect(inspect(client)).rejects.toThrow('Target inspection failed');
  expect(client.from).toHaveBeenCalledTimes(1);
});
