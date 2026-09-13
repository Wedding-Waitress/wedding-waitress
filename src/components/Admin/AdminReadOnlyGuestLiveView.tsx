import {useState} from 'react';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import {resolveWelcomeVideoUrl} from '@/lib/liveViewMediaConfig';
import styles from '@/components/Dashboard/LiveSlideshow/LiveSlideshowSetup.module.css';

const modules=[
 ['RSVP Invite','show_rsvp_invite','rsvp_invite_config','live_view_invitation'],
 ['Welcome Video','show_welcome_video','welcome_video_config','live_view_welcome'],
 ['Reception Floor Plan','show_reception_floor_plan','reception_floor_plan_config','live_view_reception'],
 ['Menu','show_menu','menu_config','live_view_menu'],
 ['Event hero image',null,'hero_image_config','live_view_hero'],
] as const;
const flags=[['Update Details','show_update_details'],['Guest Search','show_search'],['Ceremony','show_ceremony'],['Reception','show_reception'],['Invitation Video','show_invite_video'],['Floor Plan','show_floor_plan'],['Show RSVP status in search results','kiosk_show_rsvp_status'],['Show dietary requirements in search results','kiosk_show_dietary']] as const;
type Row=Record<string,unknown>;
const record=(value:unknown):value is Row=>!!value&&typeof value==='object'&&!Array.isArray(value);
const owned=(value:unknown,ownerId:string,eventId:string):value is Row=>record(value)&&typeof value.id==='string'&&!!value.id&&value.user_id===ownerId&&value.event_id===eventId;
function RecordedSwitch({label,value}:{label:string;value:unknown}){
 return <div className="flex items-center justify-between gap-3"><span>{label}</span>{typeof value==='boolean'?<><span>{value?'On':'Off'}</span><Switch aria-label={label} checked={value} disabled/></>:<span>Not recorded</span>}</div>;
}
function Asset({ownerId,eventId,recordId,kind,config}:{ownerId:string;eventId:string;recordId:string;kind:typeof modules[number][3];config:Row}){
 const [requested,setRequested]=useState(false),[failed,setFailed]=useState(false);
 const source=kind==='live_view_welcome'?resolveWelcomeVideoUrl(config):config.file_url;
 const media=useAdminPreviewMedia(ownerId,eventId,kind,recordId,requested&&typeof source==='string'&&!!source,JSON.stringify(config));
 const type=typeof config.file_type==='string'?config.file_type:null;
 if(typeof source!=='string'||!source)return <p>No saved upload is recorded. No default asset has been created.</p>;
 return <div className="space-y-2"><p>{typeof config.file_name==='string'?config.file_name:'Saved upload'}{type?` · ${type}`:''}</p>
  {!requested?<button onClick={()=>setRequested(true)}>Load verified read-only asset</button>:media.error||failed?<p role="alert">The saved asset could not be verified or loaded. No substitute has been displayed.</p>:!media.url?<p role="status">Verifying saved asset…</p>:type==='application/pdf'?<p>Verified saved PDF is available; document inspection remains pending. No public or customer access link is exposed.</p>:type?.startsWith('image/')?<img src={media.url} alt="Saved guest app artwork" className="max-h-64 max-w-full object-contain" onError={()=>setFailed(true)}/>:type?.startsWith('video/')?<video src={media.url} controls preload="metadata" className="max-h-64 max-w-full" onError={()=>setFailed(true)}/>:<p>Saved file type is not recorded or unsupported; no renderer has been guessed.</p>}
 </div>;
}
/** Business-data-only configuration. Never mounts customer hooks which upsert
 * defaults or synchronise hero uploads during a read. No share URL or QR token. */
export function AdminReadOnlyGuestLiveView({ownerId,eventId,visibility,configuration}:{ownerId:string;eventId:string;visibility:unknown;configuration:unknown}){
 const vis=owned(visibility,ownerId,eventId)?visibility:null,config=owned(configuration,ownerId,eventId)?configuration:null;
 return <Card className={styles.primaryPanel}><CardHeader><CardTitle>Guest Live View Configuration</CardTitle></CardHeader><CardContent className="space-y-3">
  <p>Read-only saved guest lookup slideshow settings. Opening this view does not publish, synchronise, upload, or create customer settings.</p>
  {!vis&&<p role="status">Saved visibility settings are unavailable or unverified. No default visibility has been substituted.</p>}
  {!config&&<p role="status">Saved module settings are unavailable or unverified. No default configuration has been substituted.</p>}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{modules.map(([label,flag,key,kind])=>{
   const saved=config&&record(config[key])?config[key]:null;
   return <section key={key} className={`${styles.tile} p-4 rounded-lg space-y-3 min-w-0`}><h3>{label}</h3>{flag&&<RecordedSwitch label={`Show ${label}`} value={vis?.[flag]}/>}
    {saved?<><p>Recorded source: {typeof saved.source==='string'?saved.source:'Not recorded'}</p><Asset key={JSON.stringify([ownerId,eventId,config?.id,key,saved])} ownerId={ownerId} eventId={eventId} recordId={config!.id as string} kind={kind} config={saved}/></>:<p>No saved module configuration is recorded.</p>}
   </section>;
  })}</div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{flags.map(([label,key])=><RecordedSwitch key={key} label={label} value={vis?.[key]}/>)}</div>
 </CardContent></Card>;
}
