import React,{useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Link} from 'react-router-dom';
import {AdminReadOnlyRunSheet,type AdminPreviewRunSheet} from './AdminReadOnlyRunSheet';
import {AdminReadOnlyCeremonyPlan,type AdminPreviewDocumentEvent} from './AdminReadOnlyCeremonyPlan';
import {AdminReadOnlyQuestionnaire} from './AdminReadOnlyQuestionnaire';
import {AdminReadOnlyGuestSongRequests} from './AdminReadOnlyGuestSongRequests';
import {AdminCustomerTeamMembers} from './AdminCustomerTeamMembers';
import {AdminCustomerAccessReview} from './AdminCentrePages';
import {AdminReadOnlyBudget} from './AdminReadOnlyBudget';
import type {EventBudgetData} from '@/hooks/useEventBudget';
import {AdminSavedReceptionPlan,type AdminPreviewReceptionRecord} from './AdminReadOnlyReceptionPlan';
import type {ReceptionTableSource} from '@/hooks/useReceptionTables';
import type {GuestSongRequestRow} from '@/hooks/useGuestSongRequests';
import type {GuestSongRequestSettings} from '@/hooks/useGuestSongRequestSettings';
import type {DJMCQuestionnaire} from '@/types/djMCQuestionnaire';
import type {CeremonyFloorPlan} from '@/hooks/useCeremonyFloorPlan';
import {AdminReadOnlyInvitations} from './AdminReadOnlyInvitations';
import type {InvitationCardSettings} from '@/hooks/useInvitationCardSettings';
import {AdminReadOnlyIndividualCharts} from './AdminReadOnlyIndividualCharts';
import {AdminReadOnlyFullSeatingChart} from './AdminReadOnlyFullSeatingChart';
import {AdminReadOnlyDietaryChart} from './AdminReadOnlyDietaryChart';
import {AdminReadOnlyPlaceCards} from './AdminReadOnlyPlaceCards';
import {AdminReadOnlySignage} from './AdminReadOnlySignage';
import {AdminReadOnlyGallery} from './AdminReadOnlyGallery';
import {AdminReadOnlyGuestbook} from './AdminReadOnlyGuestbook';
import {AdminReadOnlyAccountDetails} from './AdminReadOnlyAccountDetails';
import {AdminReadOnlySupportHistory} from './AdminReadOnlySupportHistory';
import {AdminReadOnlyQRCode} from './AdminReadOnlyQRCode';
import {AdminReadOnlyAccountSecurity} from './AdminReadOnlyAccountSecurity';
import {AdminReadOnlyRecordedSubscription} from './AdminReadOnlyRecordedSubscription';
import {AdminReadOnlySlideshow} from './AdminReadOnlySlideshow';
import {AdminReadOnlyGuestLiveView} from './AdminReadOnlyGuestLiveView';
import {AdminReadOnlyGalleryTheme} from './AdminReadOnlyGalleryTheme';
import {AdminReadOnlyEventArtwork} from './AdminReadOnlyEventArtwork';
import {AdminReadOnlyPhotoBoothDesign} from './AdminReadOnlyPhotoBoothDesign';
import {AdminReadOnlyGuestRecords} from './AdminReadOnlyGuestRecords';
import {AdminReadOnlyTables} from './AdminReadOnlyTables';
import {AdminReadOnlyBilling} from './AdminReadOnlyBilling';
import {AdminReadOnlyEventDetails} from './AdminReadOnlyEventDetails';
import {AdminReadOnlyEventCountdown} from './AdminReadOnlyEventCountdown';
import {AdminReadOnlyEventsTable} from './AdminReadOnlyEventsTable';
import {AdminReadOnlyGuestSetup} from './AdminReadOnlyGuestSetup';
import {AdminReadOnlyGuestDeliveryHistory} from './AdminReadOnlyGuestDeliveryHistory';
type Preview={read_only:true;customer:{account_id:string|null;name:string;email:string;mobile:string|null};events:{id:string;name:string;date:string|null;tables:{id:string;name:string;table_no:number|null;capacity:number;type:string|null}[];guests:{id:string;name:string;rsvp:string|null;dietary:string|null;table_no:number|null;seat_no:number|null}[]}[]};
type ExtendedEvent=Preview['events'][number]&{slug?:string|null;invitation_artworks?:InvitationCardSettings[];run_sheet?:AdminPreviewRunSheet|null;ceremony_plan?:CeremonyFloorPlan|null;document_event?:AdminPreviewDocumentEvent;questionnaire?:DJMCQuestionnaire|null;guest_song_requests?:GuestSongRequestRow[];guest_song_settings?:GuestSongRequestSettings|null;reception_plan?:AdminPreviewReceptionRecord|null;budget?:EventBudgetData};
type ExtendedPreview=Omit<Preview,'events'>&{events:ExtendedEvent[]};
function isPreviewResponse(value:unknown):value is ExtendedPreview {
 if(!value||typeof value!=='object')return false;
 const data=value as Record<string,unknown>;
 if(data.read_only!==true||!data.customer||typeof data.customer!=='object'||!Array.isArray(data.events))return false;
 const customer=data.customer as Record<string,unknown>;
 const nullableString=(value:unknown)=>value===null||typeof value==='string';
 if(typeof customer.name!=='string'||typeof customer.email!=='string'||!nullableString(customer.account_id)||!nullableString(customer.mobile))return false;
 return data.events.every(event=>event&&typeof event==='object'&&typeof event.id==='string'&&typeof event.name==='string'
  &&nullableString(event.date)&&Array.isArray(event.tables)&&Array.isArray(event.guests)
  &&(event.invitation_artworks===undefined||Array.isArray(event.invitation_artworks)&&event.invitation_artworks.every((a:any)=>a&&typeof a.id==='string'&&typeof a.name==='string'&&Array.isArray(a.text_zones)))
  &&event.tables.every((table:any)=>table&&typeof table.id==='string'&&typeof table.name==='string'&&typeof table.capacity==='number'&&Number.isFinite(table.capacity))
  &&event.guests.every((guest:any)=>guest&&typeof guest.id==='string'&&typeof guest.name==='string'&&nullableString(guest.rsvp)&&nullableString(guest.dietary)));
}
function ReceptionPreview({event,customerId}:{event:ExtendedEvent;customerId:string}) {
 const completeTables=event.tables.every(table=>['limit_seats','table_type','table_purpose','head_seating_order'].every(key=>key in table));
 const completeGuests=event.guests.every(guest=>'table_id' in guest);
 if(!event.document_event||event.reception_plan===undefined||!completeTables||!completeGuests)
  return <p>Saved Reception preview data is unavailable.</p>;
 return <AdminSavedReceptionPlan key={event.id} record={event.reception_plan}
  tables={event.tables as unknown as ReceptionTableSource[]}
  guests={event.guests as unknown as {table_id:string|null;seat_no:number|null;rsvp:string|null}[]}
    event={event.document_event} customerId={customerId}/>;
}
function EventSection({section,event,customerId,events}:{section:string;event:ExtendedEvent;customerId:string;events:ExtendedEvent[]}) {
 if(section==='Guests')return <><AdminReadOnlyGuestSetup key={`${event.id}:setup`} ownerId={customerId} eventId={event.id} savedEvent={(event as any).saved_event} guests={event.guests} preferences={(event as any).guest_notification_preferences} notifications={(event as any).guest_notifications}/><AdminReadOnlyGuestRecords key={event.id} ownerId={customerId} eventId={event.id} guests={event.guests}/><AdminReadOnlyGuestDeliveryHistory key={`${event.id}:delivery`} ownerId={customerId} eventId={event.id} guests={event.guests} logs={(event as any).guest_delivery_history} emailLogs={(event as any).event_email_history}/></>;
 if(section==='Live Slideshow')return <><AdminReadOnlyGuestLiveView key={`${event.id}:guest-live-view`} ownerId={customerId} eventId={event.id} visibility={(event as any).live_view_visibility} configuration={(event as any).live_view_configuration}/><AdminReadOnlySlideshow key={event.id} ownerId={customerId} eventId={event.id} eventName={event.name} gallery={(event as any).media_gallery} items={(event as any).media_items}/></>;
 if(section==='QR Code Seating Chart')return <AdminReadOnlyQRCode key={event.id} ownerId={customerId} eventId={event.id} eventName={event.name}
  settings={(event as any).qr_settings} dynamicRecord={(event as any).dynamic_qr_record}/>;
 if(section==='Digital Guestbook')return <AdminReadOnlyGuestbook key={event.id} ownerId={customerId} eventId={event.id} eventName={event.name}
  gallery={(event as any).media_gallery} items={(event as any).media_items} savedMessages={(event as any).guestbook_messages}/>;
 if(section==='Photo & Video Sharing'||section==='Digital Photo Booth')return <>{section==='Photo & Video Sharing'&&<AdminReadOnlyGalleryTheme key={`${event.id}:gallery-theme`} ownerId={customerId} eventId={event.id} eventName={event.name} gallery={(event as any).media_gallery}/>} {section==='Digital Photo Booth'&&<AdminReadOnlyPhotoBoothDesign key={event.id} ownerId={customerId} eventId={event.id} eventName={event.name} eventDate={event.date} gallery={(event as any).media_gallery}/>}<AdminReadOnlyGallery key={`${event.id}:${section}`}
  ownerId={customerId} eventId={event.id} eventName={event.name} gallery={(event as any).media_gallery} items={(event as any).media_items} booth={section==='Digital Photo Booth'}/></>;
 if(section==='Seating Chart Signs')return event.document_event
  ?<AdminReadOnlySignage key={event.id} ownerId={customerId} eventId={event.id} event={event.document_event}
    savedSettings={(event as any).signage_settings} qrEvents={events}/>
  :<p>Saved Seating Chart Sign event data is unavailable.</p>;
 if(section==='Name Place Cards')return event.document_event
  ?<AdminReadOnlyPlaceCards key={event.id} ownerId={customerId} eventId={event.id} event={event.document_event}
    savedSettings={(event as any).place_card_settings} savedFit={(event as any).place_card_fit} tables={event.tables} guests={event.guests}/>
  :<p>Saved Place Card event data is unavailable.</p>;
 if(section==='Dietary Requirements')return event.document_event
  ?<AdminReadOnlyDietaryChart key={event.id} ownerId={customerId} eventId={event.id} event={event.document_event}
    savedSettings={(event as any).dietary_settings} tables={event.tables} guests={event.guests}/>
  :<p>Saved Dietary Requirements event data is unavailable.</p>;
 if(section==='Full Seating Chart')return event.document_event?<AdminReadOnlyFullSeatingChart key={event.id}
  ownerId={customerId} eventId={event.id} event={event.document_event} savedSettings={(event as any).full_seating_settings}
  tables={event.tables} guests={event.guests}/>:<p>Saved Full Seating Chart content is unavailable.</p>;
 if(section==='Individual Table Charts')return event.document_event?<AdminReadOnlyIndividualCharts key={event.id}
  ownerId={customerId} eventId={event.id} event={event.document_event} snapshot={(event as any).individual_chart_settings}
  tables={event.tables} guests={event.guests}/>:<p>Saved Individual Table Chart content is unavailable.</p>;
 if(section==='Invitations and Cards')return event.document_event?<AdminReadOnlyInvitations key={event.id} artworks={event.invitation_artworks} event={event.document_event} eventId={event.id} eventSlug={event.slug} qrEvents={events} customerId={customerId}/>:<p>Saved Invitations and Cards preview data is unavailable.</p>;
 if(section==='Budget Planner')return <AdminReadOnlyBudget key={event.id} budget={event.budget} event={{id:event.id,name:event.name,date:event.date}}/>;
 if(section==='Reception Floor Plan')return <ReceptionPreview event={event} customerId={customerId}/>;
 if(section==='Guest Song Requests')return event.guest_song_requests===undefined||event.guest_song_settings===undefined
  ?<p>Saved Guest Song Requests preview data is unavailable.</p>
  :<AdminReadOnlyGuestSongRequests rows={event.guest_song_requests} settings={event.guest_song_settings} eventName={event.name} eventDate={event.date}/>;
 if(section==='DJ & MC Questionnaire')return event.document_event&&event.questionnaire!==undefined
  ?<AdminReadOnlyQuestionnaire key={event.id} eventId={event.id} questionnaire={event.questionnaire} event={event.document_event} customerId={customerId}/>
  :<p>Saved questionnaire preview data is unavailable.</p>;
 if(section==='Ceremony Floor Plan')return event.document_event&&event.ceremony_plan!==undefined
  ?<AdminReadOnlyCeremonyPlan key={event.id} plan={event.ceremony_plan} event={event.document_event}/>
  :<p>Saved Ceremony preview data is unavailable.</p>;
 if(section==='Run Sheet')return event.run_sheet===undefined?<p>Saved Run Sheet preview data is unavailable.</p>:<AdminReadOnlyRunSheet sheet={event.run_sheet}/>;
 if(section==='Events')return <><AdminReadOnlyEventArtwork key={`${event.id}:artwork`} ownerId={customerId} eventId={event.id} savedEvent={(event as any).saved_event}/><AdminReadOnlyEventDetails key={event.id} ownerId={customerId} eventId={event.id} savedEvent={(event as any).saved_event} guestCount={event.guests.length} tableCount={event.tables.length}/></>;
 if(section==='Tables')return <AdminReadOnlyTables key={event.id} ownerId={customerId} eventId={event.id} tables={event.tables} guests={event.guests}/>;
 return event.guests.length===0?<p>No guests recorded.</p>:<ul>{event.guests.map(guest=><li key={guest.id}><strong>{guest.name}</strong> — RSVP: {guest.rsvp||'Not recorded'}; Dietary: {guest.dietary||'Not recorded'}; Table: {guest.table_no??'Not assigned'}; Seat: {guest.seat_no??'Not assigned'}</li>)}</ul>;
}
export function AdminCustomerAccountPreview({customerId}:{customerId:string}){
 const [loaded,setLoaded]=useState<{customerId:string;data:ExtendedPreview}|null>(null);const [error,setError]=useState(false);
 const data=loaded?.customerId===customerId?loaded.data:null;
 const [section,setSection]=useState('Account');const [eventId,setEventId]=useState('');
 useEffect(()=>{let active=true,generation=0;let timeout:number|undefined;
  setLoaded(null);setError(false);setSection('Account');setEventId('');
  const check=async()=>{const request=++generation;if(timeout!==undefined)window.clearTimeout(timeout);setLoaded(null);setError(false);
   timeout=window.setTimeout(()=>{if(!active||request!==generation)return;generation++;setLoaded(null);setError(true);},10_000);
   try{
    const result=await supabase.rpc('admin_get_customer_account_preview' as never,{p_target:customerId} as never);
    if(!active||request!==generation)return;
    const snapshot:unknown=result.data;
    if(result.error||!isPreviewResponse(snapshot)){setError(true);return;}
    setLoaded({customerId,data:snapshot});setEventId(previous=>snapshot.events.some(event=>event.id===previous)?previous:'');
   }catch{if(active&&request===generation)setError(true);}
   finally{if(active&&request===generation&&timeout!==undefined)window.clearTimeout(timeout);}
  };
  const resume=()=>{if(document.visibilityState!=='hidden')void check();};
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);void check();
  return()=>{active=false;generation++;if(timeout!==undefined)window.clearTimeout(timeout);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[customerId]);
 return <><section aria-label="Read-only customer account preview"><h3>Customer account — read-only preview</h3>
 <Link to="/admin/customers">Back to Customers</Link>
 <p>You remain signed in as the administrator. Preview access is internally audited; no customer notification is sent.</p>
 <p>Full preview integration is still in progress. Account details and linked support history, basic event, guest and table records, Team Members, saved Budget, Run Sheet, Ceremony, Reception, DJ &amp; MC Questionnaire, Guest Song Requests, Invitations and Cards, Place Cards, Signage, Full Seating Chart, Dietary Requirements, galleries, Photo Booth captures, Guestbook, and synchronized Individual Table Chart styles are connected. Historical browser-only settings cannot be recovered. Other sections and remaining private assets are not yet available. Editing, billing actions, customer sessions, private links and credentials are unavailable.</p>
 {error?<p role="alert">Customer account preview is unavailable. No customer account changes were made.</p>:!data?<p role="status">Loading customer account…</p>:<>
 <h4>{data.customer.name}</h4><p>Customer ID: {data.customer.account_id||'Not available'}</p>
 <nav aria-label="Read-only customer sections">{['Account','Billing history','Support history','Team Members','Events','Guests','Tables','Budget Planner','QR Code Seating Chart','Run Sheet','Ceremony Floor Plan','Reception Floor Plan','DJ & MC Questionnaire','Guest Song Requests','Invitations and Cards','Individual Table Charts','Full Seating Chart','Dietary Requirements','Name Place Cards','Seating Chart Signs','Photo & Video Sharing','Digital Photo Booth','Digital Guestbook','Live Slideshow'].map(label=><button key={label} aria-pressed={section===label} onClick={()=>setSection(label)}>{label}</button>)}</nav>
 {section==='Billing history'?<AdminReadOnlyBilling key={customerId} ownerId={customerId}/>:section==='Team Members'?<AdminCustomerTeamMembers customerId={customerId} ready/>:section==='Account'?<><AdminReadOnlyAccountDetails ownerId={customerId} customer={data.customer}/><AdminReadOnlyAccountSecurity ownerId={customerId} customer={data.customer}/><AdminReadOnlyRecordedSubscription ownerId={customerId} subscription={(data as any).recorded_subscription}/></>:section==='Support history'?<AdminReadOnlySupportHistory key={customerId} ownerId={customerId} tickets={(data as any).support_tickets}/>:<>
 {section!=='Events'&&data.events.length>0&&<label>Event <select value={eventId||data.events[0].id} onChange={event=>setEventId(event.target.value)}>{data.events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></label>}
 {section==='Events'&&<><AdminReadOnlyEventCountdown ownerId={customerId} customer={data.customer} events={data.events}/><AdminReadOnlyEventsTable ownerId={customerId} customer={data.customer} events={data.events}/></>}
 {data.events.length===0?<p>No events recorded.</p>:data.events.filter(event=>section==='Events'||event.id===(eventId||data.events[0].id)).map(event=><section key={event.id}><h4>{event.name}</h4><p>{event.date||'Date not recorded'}</p>
 <EventSection section={section} event={event} customerId={customerId} events={data.events}/></section>)}
 </>}
 </>}
 </section>{data&&<AdminCustomerAccessReview customerId={customerId} targetName={data.customer.name}/>}</>;
}
