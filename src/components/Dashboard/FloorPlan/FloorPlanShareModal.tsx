import {useEffect,useState,useCallback,useRef} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Copy,ExternalLink,Trash2,Share2,LoaderCircle} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import styles from '../RunningSheet/RunningSheetTheme.module.css';
import floorStyles from './FloorPlanPage.module.css';
export function FloorPlanShareModal({open,onOpenChange,eventId,kind}:{open:boolean;onOpenChange:(v:boolean)=>void;eventId:string;kind:'ceremony'|'reception'}){
 const [links,setLinks]=useState<any[]>([]),[name,setName]=useState(''),[busy,setBusy]=useState(false),[created,setCreated]=useState(''),[permission,setPermission]=useState('view_only');
 const [progress,setProgress]=useState(''); const {toast}=useToast();
 const operation=useRef(false), scope=useRef({eventId,kind,version:0}), revision=useRef(0);
 if(scope.current.eventId!==eventId||scope.current.kind!==kind) scope.current={eventId,kind,version:scope.current.version+1};
 const refreshRequest=useRef<Promise<void>|null>(null);
 const refreshScope=useRef(scope.current), revoked=useRef(new Set<string>());
 const refresh=useCallback(()=>{
  if(refreshRequest.current)return refreshRequest.current;
  const current=scope.current, startedRevision=revision.current;
  const request=(async()=>{
   const {data,error}=await (supabase as any).from('floor_plan_share_tokens').select('*').eq('event_id',eventId).eq('kind',kind).order('created_at',{ascending:false});
   if(error)throw error;
   if(scope.current!==current)return;
   setLinks(previous=>revision.current===startedRevision ? data??[] : [...previous,...(data??[]).filter((row:any)=>!revoked.current.has(row.id)&&!previous.some(saved=>saved.id===row.id))]);
  })().finally(()=>{if(refreshRequest.current===request)refreshRequest.current=null;});
  refreshRequest.current=request;return request;
 },[eventId,kind]);
 const fail=()=>toast({title:'Could not update sharing',description:'Please try again.',variant:'destructive'});
 useEffect(()=>{if(refreshScope.current===scope.current)return;refreshScope.current=scope.current;setLinks([]);setCreated('');refreshRequest.current=null;revision.current=0;revoked.current.clear();},[eventId,kind]);
 useEffect(()=>{if(open){setCreated('');void refresh().catch(fail)}},[open,refresh]);
 const url=(token:string)=>window.location.origin+'/share/'+kind+'/'+token;
 const copy=async(token:string)=>{const link=url(token);setCreated(link);try{await navigator.clipboard.writeText(link);toast({title:'Link copied'});}catch{toast({title:'Link ready',description:'Automatic copying failed. Select and copy the link from the field below.'});}};
 const create=async()=>{
  if(operation.current)return;operation.current=true;const current=scope.current;
  setBusy(true);setProgress('Generating share link...');
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in');
   if(scope.current!==current)return;
   const {data,error}=await (supabase as any).from('floor_plan_share_tokens').insert({event_id:eventId,user_id:user.id,kind,permission:kind==='reception'?permission:'view_only',recipient_name:name.trim()||null}).select().single();
   if(error||!data?.token)throw error||Error('Missing share link');
   if(scope.current!==current)return;
   revision.current++;setLinks(previous=>[data,...previous.filter(link=>link.id!==data.id)]);
   setCreated(url(data.token));setProgress('Copying share link...');
   await copy(data.token);setName('');
  }catch{if(scope.current===current)fail();}finally{operation.current=false;setBusy(false);setProgress('');}
 };
 const remove=async(id:string)=>{if(operation.current)return;operation.current=true;setBusy(true);try{const {data,error}=await (supabase as any).from('floor_plan_share_tokens').delete().eq('id',id).select('id');if(error||!data?.length)throw Error('Denied');revision.current++;revoked.current.add(id);setLinks(previous=>previous.filter(link=>link.id!==id));toast({title:'Share link revoked'});}catch{fail()}finally{operation.current=false;setBusy(false)}};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={styles.shareModal+' max-w-lg'}><DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 size={18}/>Share {kind==='ceremony'?'Ceremony':'Reception'} Floor Plan</DialogTitle><DialogDescription>Share this floor plan with your venue coordinator, suppliers or wedding party.</DialogDescription></DialogHeader><Tabs defaultValue="create" className="mt-4"><TabsList className={styles.shareTabs+' grid w-full grid-cols-2'}><TabsTrigger value="create">Create Link</TabsTrigger><TabsTrigger value="manage">Manage ({links.length})</TabsTrigger></TabsList><TabsContent value="create" className="space-y-4 mt-4"><div className="space-y-2"><Label htmlFor="floor-share-recipient">Recipient Name (Optional)</Label><Input id="floor-share-recipient" value={name} maxLength={200} onChange={e=>setName(e.target.value)} placeholder="e.g., Venue Coordinator"/></div><div className="space-y-2"><Label>Permission Level</Label>{kind==='reception'?<><select aria-label="Permission Level" className="w-full rounded-lg border p-3 text-sm bg-transparent" value={permission} onChange={e=>setPermission(e.target.value)}><option value="view_only">View Only</option><option value="can_edit">Can Edit</option></select><p className="text-xs">{permission==='can_edit'?'Can edit a reception draft, place existing tables and fixtures, add setup notes and submit a venue template. Other account pages are unavailable. You approve their draft before it changes your layout.':'Can see but not edit.'}</p></>:<div className="rounded-lg border p-3 text-sm">View Only<div className="text-xs">Can see but not edit</div></div>}</div><Button className={styles.primaryAction+' w-full '+floorStyles.generateLinkButton} disabled={busy} onClick={create}>{busy?<LoaderCircle className="mr-2 w-4 h-4 animate-spin"/>:<Copy className="mr-2 w-4 h-4"/>}Generate &amp; Copy Link</Button>{progress&&<p role="status" aria-live="polite" className="text-sm">{progress}</p>}</TabsContent><TabsContent value="manage" className="max-h-72 overflow-y-auto space-y-3 mt-4">{!links.length&&<p>No share links created yet</p>}{links.map(link=><div key={link.id} className={styles.managedLinkCard+' p-3 rounded-lg flex items-center gap-2'}><div className="flex-1 min-w-0"><p className="font-semibold truncate">{link.recipient_name||'Unnamed'}</p><p className="text-xs">{new Date(link.expires_at)<new Date()?'Expired':link.permission==='can_edit'?'Can Edit':'View Only'} · Expires {new Date(link.expires_at).toLocaleDateString()}</p></div>{kind==='reception'&&<select aria-label={'Permission for '+(link.recipient_name||'Unnamed')} disabled={busy} value={link.permission} onChange={async e=>{const value=e.target.value;setBusy(true);try{const {data,error}=await (supabase as any).from('floor_plan_share_tokens').update({permission:value}).eq('id',link.id).select('id');if(error||!data?.length)throw Error('Denied');revision.current++;setLinks(previous=>previous.map(row=>row.id===link.id?{...row,permission:value}:row));}catch{fail()}finally{setBusy(false)}}}><option value="view_only">View Only</option><option value="can_edit">Can Edit</option></select>}<Button variant="ghost" size="icon" aria-label="Copy link" onClick={()=>copy(link.token)}><Copy size={18}/></Button><a href={url(link.token)} target="_blank" rel="noopener noreferrer" aria-label="Open link"><ExternalLink size={18}/></a><Button variant="ghost" size="icon" aria-label="Delete link" disabled={busy} onClick={()=>remove(link.id)}><Trash2 size={18}/></Button></div>)}</TabsContent></Tabs>{created&&<div className="space-y-2"><Label htmlFor="generated-floor-share-link">Share link</Label><Input id="generated-floor-share-link" aria-label="Share link" readOnly value={created} onFocus={e=>e.target.select()}/><p className="text-xs">Select the link to copy it manually if automatic copying is unavailable.</p></div>}</DialogContent></Dialog>;
}
