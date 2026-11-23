import {useEffect,useMemo,useState,useRef} from 'react';
import {Link,useParams} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {GuestLookup} from './GuestLookup';
import {GuestExperiencePreviewContext} from '@/contexts/GuestExperiencePreviewContext';
import {createGuestPreviewClient,loadOrganiserGuestPreview,type GuestPreviewSnapshot,type PreviewMode} from '@/lib/organiserGuestPreview';
import {SeoHead} from '@/components/SEO/SeoHead';
export default function OrganiserGuestPreview(){
 const {eventId,previewMode}=useParams();const mode:PreviewMode=previewMode==='seating'?'seating':'invitation';
 const actorId=useRef<string|null>(null);
 const [snapshot,setSnapshot]=useState<GuestPreviewSnapshot|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;actorId.current=null;setSnapshot(null);setError('');
  if(!eventId||!['invitation','seating'].includes(previewMode||'')){setError('Choose a valid private preview from the QR Code page.');return;}
  const {data:subscription}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||event==='USER_UPDATED'||(actorId.current&&session?.user?.id!==actorId.current)){setSnapshot(null);setError('Your session changed. Reopen the preview.');active=false;}});
  void loadOrganiserGuestPreview(eventId).then(data=>{if(active){actorId.current=data.actorId||null;setSnapshot(data);}}).catch(()=>{if(active)setError('Preview unavailable. Sign in with an account authorised to organise this event.');});
  return()=>{active=false;subscription.subscription.unsubscribe();};
 },[eventId,previewMode]);
 const value=useMemo(()=>snapshot?{snapshot,mode,client:createGuestPreviewClient(snapshot)}:null,[snapshot,mode]);
 const scopeMatches=value?.snapshot.event.id===eventId;
 return <><SeoHead title="Organiser guest preview | Wedding Waitress" description="Private read-only guest experience preview for authorised event organisers." noIndex/>
  <aside data-organiser-preview-banner className="sticky top-0 z-50 bg-[#f5ebdc] text-[#2f1b14] border-b border-[#806344] p-4 text-center space-y-2">
   <strong>Organiser preview</strong><p>Read-only simulation. No SMS, saved responses, credits, notifications or guest analytics. Your actual event date stays unchanged.</p>
   <nav aria-label="Preview timing" className="flex flex-wrap justify-center gap-3">
    <Link aria-current={mode==='invitation'?'page':undefined} to={'/organiser-preview/'+eventId+'/invitation'}>More than 7 days before</Link>
    <Link aria-current={mode==='seating'?'page':undefined} to={'/organiser-preview/'+eventId+'/seating'}>Within 7 days / event day</Link>
    <Link to="/dashboard?tab=qr-code">Back to QR Code Seating Chart</Link>
   </nav>
  </aside>
  {error?<p role="alert" className="p-8 text-center">{error}</p>:!value||!scopeMatches?<p role="status" className="p-8 text-center">Checking organiser access…</p>:<GuestExperiencePreviewContext.Provider value={value}><GuestLookup key={eventId+':'+mode}/></GuestExperiencePreviewContext.Provider>}
 </>;
}
