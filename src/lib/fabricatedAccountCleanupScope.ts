// Prepared maintenance scope only; this module performs no writes.
export const preservedOwnerId='a0dba7aa-b67a-4856-8e7e-4af91d43d3fa';
export const fabricatedAccountTargets=Object.freeze([
 {id:'a6dff6f3-9fa8-4b9a-a699-41bbe43ad7e0',reference:'XX-PHVDQWI4',name:'Rasha Fayrooz Ali'},
 {id:'72fc844c-a65b-4c3b-9625-9c47aa62759a',reference:'XX-CAHVZWGA',name:'Rebecca Madden'},
 {id:'46a2c49f-ab0c-490a-b2b3-0a9a25392422',reference:'XX-F628LAGH',name:'Ashot Araqelyan'},
 {id:'383d732e-a85e-4f02-80ba-9378959abc6e',reference:'XX-38MVD2CU',name:'Phoenix James'},
 {id:'38e042fc-8a4a-4781-b4e9-7c4bbf755494',reference:'XX-42KIKTFT',name:'Andrea Mendoza'},
 {id:'61673e8d-ae9d-4d7d-8c36-44ef076f0355',reference:'XX-742F18SJ',name:'Rochelle Philogene'},
].map(target=>Object.freeze(target)));
export type CleanupEvidence={
 identities:ReadonlyArray<{id:string;reference:string;name:string}>;
 currentOwnerId:string;
 sharedMemberships:number;sharedEmails:number;otherEmailUsers:number;
 events:number;financialPurchases:number;storageObjects:number;
 inventoryComplete:boolean;
};
export function verifyFabricatedAccountScope(evidence:CleanupEvidence){
 if(evidence.currentOwnerId!==preservedOwnerId)throw new Error('Verified preserved owner required');
 if(evidence.inventoryComplete!==true)throw new Error('Complete inventory required');
 if(evidence.identities.length!==6||new Set(evidence.identities.map(row=>row.id)).size!==6)throw new Error('Exact six identities required');
 for(const target of fabricatedAccountTargets){
  const actual=evidence.identities.find(row=>row.id===target.id);
  if(!actual||actual.reference!==target.reference||actual.name!==target.name)throw new Error('Approved identity changed');
 }
 for(const key of ['sharedMemberships','sharedEmails','otherEmailUsers','events','financialPurchases','storageObjects'] as const){
  if(evidence[key]!==0)throw new Error(`Unexpected or uncertain ${key}`);
 }
 return fabricatedAccountTargets;
}
