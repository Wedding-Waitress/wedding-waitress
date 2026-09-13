import {describe,it,expect,vi} from 'vitest';
import {startAuthenticatedCustomerActivity} from './authenticatedCustomerActivity';
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
describe('meaningful authenticated activity',()=>{
 it('samples real gestures, not idle time, and stops cleanly',async()=>{
  let now=0;const record=vi.fn().mockResolvedValue(null);
  const stop=startAuthenticatedCustomerActivity(record,{target:window,doc:{visibilityState:'visible'},now:()=>now,trusted:()=>true});
  expect(record).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('pointerdown'));await flush();expect(record).toHaveBeenCalledTimes(1);
  now=100;window.dispatchEvent(new Event('pointerdown'));await flush();expect(record).toHaveBeenCalledTimes(1);
  now=15000;window.dispatchEvent(new KeyboardEvent('keydown'));await flush();expect(record).toHaveBeenCalledTimes(2);
  stop();now=30000;window.dispatchEvent(new Event('pointerdown'));await flush();expect(record).toHaveBeenCalledTimes(2);
 });
 it('ignores synthetic, hidden, and repeated key events',async()=>{
  const record=vi.fn().mockResolvedValue(null);let trusted=false;
  const doc={visibilityState:'visible' as DocumentVisibilityState};
  const stop=startAuthenticatedCustomerActivity(record,{target:window,doc,now:()=>0,trusted:()=>trusted});
  window.dispatchEvent(new Event('pointerdown'));trusted=true;doc.visibilityState='hidden';window.dispatchEvent(new Event('pointerdown'));
  doc.visibilityState='visible';window.dispatchEvent(new KeyboardEvent('keydown',{repeat:true}));await flush();expect(record).not.toHaveBeenCalled();stop();
 });
 it('contains failures without background retries',async()=>{
  const record=vi.fn().mockRejectedValue(new Error('offline'));
  const stop=startAuthenticatedCustomerActivity(record,{target:window,doc:{visibilityState:'visible'},now:()=>0,trusted:()=>true});
  window.dispatchEvent(new Event('pointerdown'));await flush();expect(record).toHaveBeenCalledTimes(1);stop();
 });
});
