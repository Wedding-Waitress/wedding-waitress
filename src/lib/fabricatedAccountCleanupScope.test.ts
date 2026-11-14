import {expect,it} from 'vitest';
import {fabricatedAccountTargets,preservedOwnerId,verifyFabricatedAccountScope,type CleanupEvidence} from './fabricatedAccountCleanupScope';
const clean=():CleanupEvidence=>({identities:fabricatedAccountTargets.map(row=>({...row})),currentOwnerId:preservedOwnerId,sharedMemberships:0,sharedEmails:0,otherEmailUsers:0,events:0,financialPurchases:0,storageObjects:0,inventoryComplete:true});
it('accepts only the immutable six and excludes preserved owner',()=>{
 expect(verifyFabricatedAccountScope(clean())).toBe(fabricatedAccountTargets);
 expect(fabricatedAccountTargets.some(row=>row.id===preservedOwnerId)).toBe(false);
 expect(Object.isFrozen(fabricatedAccountTargets)).toBe(true);
 expect(fabricatedAccountTargets.every(Object.isFrozen)).toBe(true);
});
it('rejects owner substitution and incomplete inventory',()=>{
 expect(()=>verifyFabricatedAccountScope({...clean(),currentOwnerId:'other'})).toThrow();
 expect(()=>verifyFabricatedAccountScope({...clean(),inventoryComplete:false})).toThrow();
});
for(const field of ['id','reference','name'] as const)it(`rejects changed ${field}`,()=>{
 const evidence=clean();evidence.identities=evidence.identities.map((row,index)=>index===0?{...row,[field]:'changed'}:row);
 expect(()=>verifyFabricatedAccountScope(evidence)).toThrow();
});
it('rejects missing, duplicate, extra and owner identities',()=>{
 for(const identities of [clean().identities.slice(1),[...clean().identities,clean().identities[0]],[...clean().identities.slice(1),clean().identities[1]],[...clean().identities.slice(1),{id:preservedOwnerId,reference:'owner',name:'owner'}]]){
  expect(()=>verifyFabricatedAccountScope({...clean(),identities})).toThrow();
 }
});
for(const key of ['sharedMemberships','sharedEmails','otherEmailUsers','events','financialPurchases','storageObjects'] as const)it(`fails closed for ${key}`,()=>{
 for(const value of [1,-1,NaN,undefined,null])expect(()=>verifyFabricatedAccountScope({...clean(),[key]:value} as CleanupEvidence)).toThrow();
});
