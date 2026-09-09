
import {useEffect,useRef,useState,useCallback} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ReceptionFloorPlanCanvas} from './ReceptionFloorPlan/ReceptionFloorPlanCanvas';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import type {ReceptionTable} from '@/hooks/useReceptionTables';
import type {ReceptionPdfEvent} from '@/lib/receptionFloorPlanPdfExporter';
export function ReceptionDraftReview({plan,tables,event,backgroundUrl,settle,reload}:{plan:ReceptionFloorPlan;tables:ReceptionTable[];event:ReceptionPdfEvent;backgroundUrl:string|null;settle:()=>Promise<void>;reload:()=>Promise<void>}){
 const [drafts,setDrafts]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const ref=useRef<HTMLDivElement>(null),date=useRef(new Date());
 const refresh=useCallback(async()=>{const {data,error}=await (supabase as any).from('reception_collaborator_drafts').select('*').eq('event_id',plan.event_id).eq('status','submitted');if(error){setError('Could not check venue drafts. Please retry.');return;}setDrafts(data??[]);},[plan.event_id]);
 useEffect(()=>{setSelected(null);void refresh();const id=window.setInterval(refresh,30000);return()=>window.clearInterval(id);},[refresh]);
 async function review(accept:boolean){setBusy(true);setError('');try{await settle();const {error}=await (supabase as any).rpc('review_reception_collaborator_draft',{_link_id:selected.link_id,_revision:selected.revision,_accept:accept});if(error)throw error;if(accept)await reload();setSelected(null);await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <>{(drafts.length>0||error)&&<section className="my-4 rounded-xl border border-[#c8b18e] bg-[#f5eddf] p-4"><h3 className="text-xl font-bold">Venue Drafts for Your Review</h3>{drafts.map(d=><div key={d.link_id} className="flex items-center justify-between gap-4 mt-3"><span>{d.recipient_name||'Venue collaborator'} · {new Date(d.updated_at).toLocaleString()}</span><Button onClick={()=>{setError('');setSelected(d)}}>Review Draft</Button></div>)}{error&&!selected&&<p role="alert">{error}</p>}</section>}
 <Dialog open={!!selected} onOpenChange={v=>{if(!v&&!busy)setSelected(null)}}><DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto"><DialogHeader><DialogTitle>Review Reception Floor Plan Draft</DialogTitle></DialogHeader><p>This is {selected?.recipient_name||'your collaborator'}’s proposed layout. Approve to replace your reception layout and vendor notes, or request a new draft.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<div className="flex gap-3"><Button disabled={busy} onClick={()=>review(true)}>Approve &amp; Apply Layout</Button><Button disabled={busy} variant="outline" onClick={()=>review(false)}>Request a New Draft</Button></div>{selected&&<ReceptionFloorPlanCanvas plan={{...plan,...selected.payload}} tables={tables} event={event} attendingCount={0} generatedAt={date.current} a4Ref={ref} backgroundUrl={backgroundUrl} onChange={()=>{}} readOnly/>}</DialogContent></Dialog></>;
}
