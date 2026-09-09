import { Printer as ExportControlsPrinter } from 'lucide-react';

import {useCallback,useEffect,useRef,useState} from 'react';
import logoImage from '@/assets/wedding-waitress-full-logo.png';
import {Building2,Download,UploadCloud,Save,Send,Gift,LockKeyhole,CreditCard} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {supabase} from '@/integrations/supabase/client';
import {productNavigationItems} from '@/config/productNavigation';
import type {SharePayload} from '@/hooks/useReceptionFloorPlanShare';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import {useReceptionLayoutHistory,resetReceptionLayout} from '@/hooks/useReceptionLayoutHistory';
import {ReceptionFloorPlanCanvas} from './ReceptionFloorPlan/ReceptionFloorPlanCanvas';
import {VendorNotesPanel} from './ReceptionFloorPlan/VendorNotesPanel';
import {exportReceptionPreviewToPdf} from '@/lib/receptionFloorPlanPdfExporter';
import VenueFloorPlanUpload from '@/pages/VenueFloorPlanUpload';
import styles from './ReceptionCollaboratorView.module.css';

export async function collaboratorRequest(token:string,body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke('floor-plan-share',{body:{...body,token}});
 if(error){let message='Could not save. Please check your connection and try again.';try{const response=await (error as any).context?.json();message=response?.error||message;}catch{}throw Error(message);}
 if(data?.error)throw Error(data.error);return data;
}
export function ReceptionCollaboratorView({token,data,backgroundUrl}:{token:string;data:SharePayload;backgroundUrl:string|null}){
 const [plan,setPlan]=useState(()=>data.draft&&['draft','submitted'].includes(data.draft.status)?{...data.plan,...data.draft.payload}:data.plan);
 const current=useRef(plan);const [revision,setRevision]=useState(data.draft?.revision??0);
 const [status,setStatus]=useState(data.draft?.status??'new'),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [upload,setUpload]=useState(false),[reset,setReset]=useState(false);
 const locked=busy||status==='submitted';
 const commit=useCallback((mutator:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>{if(locked)return;const next=mutator(current.current);if(next!==current.current){current.current=next;setPlan(next);setDirty(true);setMessage('');}},[locked]);
 const {update,undo,canUndo}=useReceptionLayoutHistory(data.plan.event_id,commit,data.tables);
 const a4=useRef<HTMLDivElement>(null),generated=useRef(new Date());
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
 async function save(submit:boolean){setBusy(true);setError('');try{const result=await collaboratorRequest(token,{action:submit?'submit':'save',plan:current.current,revision,baseUpdatedAt:data.baseUpdatedAt});const next={...current.current,...result.payload};current.current=next;setPlan(next);setRevision(result.revision);setStatus(result.status);setDirty(false);setMessage(submit?'Sent to the couple for approval. Your draft is now read-only until they review it.':'Draft saved. Send it to the couple when you are ready.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function download(){setBusy(true);setError('');try{if(a4.current)await exportReceptionPreviewToPdf({pageElement:a4.current,eventName:data.event.name,eventDate:data.event.date});}catch{setError('Could not download the PDF. Please try again.');}finally{setBusy(false);}}
 return <div className={styles.shell}>
 <aside className={styles.sidebar} aria-label="Wedding Waitress pages (unavailable in shared access)"><img src={logoImage} alt="Wedding Waitress"/><p>Reception collaborator access</p>{[productNavigationItems[0],{sidebarId:'budget',sidebarLabel:'Event Budget Planner',icon:CreditCard},...productNavigationItems.slice(1)].map(({sidebarId,sidebarLabel,icon:Icon})=><button type="button" disabled key={sidebarId} className={sidebarId==='floor-plan'?styles.active:''}><Icon size={17}/>{sidebarLabel}</button>)}<p><LockKeyhole size={14}/> Other account pages are private.</p></aside>
 <main className={styles.main}><section className={`${styles.panel} ${styles.headerPanel}`}><div className={styles.headerDetails}><h1>Floor Plan</h1><p>Help {data.event.name} prepare their reception layout.</p><div><strong>Event: </strong>{data.event.name}<br/><strong>Floor Plan Type: </strong>Reception</div></div><SharedTrialOffer token={token}/><div data-export-controls-panel className={styles.exportControls}><span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span><Button onClick={download} disabled={busy} className={styles.green}><Download size={16}/> Download PDF</Button></div></section>
 <section className={styles.panel}><h2>Reception Setup &amp; Status</h2><div className={styles.columns}><section className={styles.inset}><h2><Building2 size={20}/> Venue Templates</h2><p>Share your venue’s empty room plans with couples using Wedding Waitress.</p><div className={styles.actions}><Button disabled title="Venue lookup is unavailable in collaborator access">Look Up Venue Floor Plan Template</Button><Button onClick={()=>setUpload(true)}><UploadCloud size={16}/> Submit Venue Template</Button></div></section><fieldset disabled={locked} className={styles.notes}><VendorNotesPanel plan={plan} onChange={update}/></fieldset></div>
 <div className={styles.draft}><div><strong>{status==='submitted'?'Awaiting couple’s approval':dirty?'Unsaved draft changes':status==='approved'?'Your previous draft was approved':status==='rejected'?'The couple requested a new draft':'Reception layout draft'}</strong><p>Your edits are saved separately. The couple reviews them before their floor plan is updated.</p></div><div className={styles.actions}><Button disabled={locked||!dirty} onClick={()=>save(false)}><Save size={16}/> Save Draft</Button><Button disabled={locked} className={styles.green} onClick={()=>save(true)}><Send size={16}/> Send to Couple for Approval</Button></div></div>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{status==='submitted'&&<Button variant="outline" onClick={()=>window.location.reload()}>Check Review Status</Button>}
 <ReceptionFloorPlanCanvas plan={plan} tables={data.tables} event={data.event} attendingCount={data.attendingCount} generatedAt={generated.current} a4Ref={a4} backgroundUrl={backgroundUrl} onChange={update} onUndo={undo} undoDisabled={!canUndo||locked} onResetRequest={()=>setReset(true)} resetDisabled={locked} readOnly={locked}/>
 </section>
 </main>
 <Dialog open={upload} onOpenChange={setUpload}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Submit Venue Template</DialogTitle></DialogHeader><VenueFloorPlanUpload shareToken={token} onExit={()=>setUpload(false)}/></DialogContent></Dialog>
 <Dialog open={reset} onOpenChange={setReset}><DialogContent><DialogHeader><DialogTitle>Reset this draft layout?</DialogTitle></DialogHeader><p>This restores the default fixtures and table positions in your draft. Vendor notes remain saved.</p><div className="flex gap-3"><Button onClick={()=>{update(p=>resetReceptionLayout(p,data.tables));setReset(false);}}>Reset Layout</Button><Button variant="outline" onClick={()=>setReset(false)}>Cancel</Button></div></DialogContent></Dialog>

 </div>;
}
function TrialInterest({token,open,onOpenChange}:{token:string;open:boolean;onOpenChange:(v:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Explore an Extended Free Trial</DialogTitle></DialogHeader>{done?<p role="status">Thank you! Wedding Waitress has received your interest and will contact you.</p>:<form className="space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await collaboratorRequest(token,{action:'trial',...Object.fromEntries(f),consent:true});setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><p>Leave your business details and we’ll get in touch to discuss an extended free trial. No account or trial starts automatically.</p><label className="block">Venue / business name<Input name="venue_name" required maxLength={250}/></label><label className="block">Email<Input name="venue_email" type="email" required maxLength={250}/></label><label className="block">Contact number<Input name="venue_contact_number" required maxLength={250}/></label><label className="flex gap-2"><input type="checkbox" required/>Yes, Wedding Waitress may contact me about an extended free trial.</label>{error&&<p role="alert">{error}</p>}<Button disabled={busy} type="submit">Send My Interest</Button></form>}</DialogContent></Dialog>;
}

export function SharedTrialOffer({token}:{token:string}){const [trial,setTrial]=useState(false);return <><section className={styles.offer}><div><h2><Gift size={25} aria-hidden="true"/>Plan more celebrations with Wedding Waitress</h2><p>Interested in an extended free trial for your venue or planning business?</p><p>Our team would love to hear from you.</p></div><Button onClick={()=>setTrial(true)} className={styles.green}>I'm Interested in a Free Trial</Button></section><TrialInterest token={token} open={trial} onOpenChange={setTrial}/></>;}
