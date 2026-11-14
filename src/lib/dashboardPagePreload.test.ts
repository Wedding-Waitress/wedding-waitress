import {describe,expect,it,vi} from 'vitest';
import {createPagePreloader,dashboardPageLoaders} from './dashboardPagePreload';
import {productNavigationItems} from '@/config/productNavigation';
const deferred=()=>{let resolve!:(value?:unknown)=>void;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
describe('dashboard page download priority',()=>{
 it('limits background work and immediately promotes a page the user requests',async()=>{
  const pending=Array.from({length:6},deferred);
  const loaders=Object.fromEntries(pending.map((d,i)=>['page-'+i,vi.fn(()=>d.promise)]));
  const p=createPagePreloader(loaders);const warm=p.warmAll();await Promise.resolve();
  expect(Object.values(loaders).filter(fn=>fn.mock.calls.length)).toHaveLength(2);
  const urgent=p.preload('page-5');await Promise.resolve();expect(loaders['page-5']).toHaveBeenCalledOnce();
  expect(p.preload('page-5')).toBe(urgent);
  pending.forEach(d=>d.resolve());await warm;
  for(const loader of Object.values(loaders))expect(loader).toHaveBeenCalledOnce();
 });
 it('allows a failed speculative load to be retried without rejecting the entire warmup',async()=>{
  const loader=vi.fn().mockRejectedValueOnce(Error('Temporary connection failure')).mockResolvedValue('ready');
  const p=createPagePreloader({page:loader});expect((await p.warmAll())[0].status).toBe('rejected');
  await expect(p.preload('page')).resolves.toBe('ready');expect(p.preload('unknown')).toBeUndefined();
 });
 it('warms all sidebar feature destinations and the five gallery workspaces',()=>{
  expect(Object.keys(dashboardPageLoaders)).toHaveLength(21);
  expect(productNavigationItems.every(item=>item.sidebarId in dashboardPageLoaders)).toBe(true);
  expect(Object.keys(dashboardPageLoaders).filter(k=>k.startsWith('photo-video-gallery/'))).toHaveLength(5);
 });
});
