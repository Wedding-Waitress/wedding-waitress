export const CUSTOMER_ACTIVITY_SAMPLE_MS=1_000;
export function startAuthenticatedCustomerActivity(record:()=>Promise<unknown>,options:{
 target:Window;doc:Pick<Document,'visibilityState'>;now:()=>number;trusted?:(event:Event)=>boolean;
}):()=>void {
 let last=-Infinity; let busy=false; let stopped=false;
 const activity=(event:Event)=>{
  if(stopped||busy||options.doc.visibilityState!=='visible'||!(options.trusted?.(event)??event.isTrusted))return;
  if(event instanceof KeyboardEvent&&event.repeat)return;
  const now=options.now(); if(now-last<CUSTOMER_ACTIVITY_SAMPLE_MS)return;
  last=now;busy=true;
  void Promise.resolve().then(record).catch(()=>{/* Next real interaction retries; never write for idle background time. */}).finally(()=>{busy=false;});
 };
 options.target.addEventListener('pointerdown',activity,true);
 options.target.addEventListener('keydown',activity,true);
 return ()=>{stopped=true;options.target.removeEventListener('pointerdown',activity,true);options.target.removeEventListener('keydown',activity,true);};
}
