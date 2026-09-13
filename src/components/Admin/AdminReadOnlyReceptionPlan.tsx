import React, {useRef, useState} from 'react';
import {ReceptionFloorPlanCanvas} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas';
import type {ReceptionA4Event} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4';
import {receptionFloorPlanFromRow,type ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import {receptionTablesFromRecords,type ReceptionTable,type ReceptionTableSource} from '@/hooks/useReceptionTables';
import {normalizeRsvp} from '@/lib/rsvp';
import {exportReceptionPreviewToPdf} from '@/lib/receptionFloorPlanPdfExporter';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';

export type AdminPreviewReceptionRecord=Parameters<typeof receptionFloorPlanFromRow>[0];
export function AdminSavedReceptionPlan({record,tables,guests,event,customerId}:{
  record:AdminPreviewReceptionRecord|null;tables:ReceptionTableSource[];
  guests:{table_id:string|null;seat_no:number|null;rsvp:string|null}[];event:ReceptionA4Event;customerId?:string;
}) {
  const media=useAdminPreviewMedia(customerId,record?.event_id??'','reception_background',undefined,!!record?.background_image_url&&record.background_visible!==false);
  if(media.loading)return <p role="status">Checking saved Reception background…</p>;
  return <AdminReadOnlyReceptionPlan plan={record?receptionFloorPlanFromRow(record):null}
    tables={receptionTablesFromRecords(tables,guests)} event={event}
    attendingCount={guests.filter(guest=>normalizeRsvp(guest.rsvp)==='Attending').length} backgroundUrl={media.url}/>;
}

/** Saved data only: never mounts the organizer hook that creates or saves plans. */
export function AdminReadOnlyReceptionPlan({plan,tables,event,attendingCount,backgroundUrl=null}:{
  plan:ReceptionFloorPlan|null;tables:ReceptionTable[];event:ReceptionA4Event;
  attendingCount:number;backgroundUrl?:string|null;
}) {
  const documentRef=useRef<HTMLDivElement>(null);
  const [generatedAt]=useState(()=>new Date());
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  if (!plan) return <p>No saved Reception Floor Plan recorded.</p>;
  // Do not silently export an incomplete customer document when private media is unavailable.
  if (plan.background.path && plan.background.visible && !backgroundUrl)
    return <p role="alert">The saved Reception background requires verified read-only media access. Preview and PDF are unavailable until that access is connected.</p>;
  const download=async()=>{
    if (!documentRef.current||busy) return;
    setBusy(true);setError(false);
    try {await exportReceptionPreviewToPdf({pageElement:documentRef.current,eventName:event.name,eventDate:event.date});}
    catch {setError(true);} finally {setBusy(false);}
  };
  return <section aria-label="Read-only Reception Floor Plan">
    <button disabled={busy} onClick={()=>void download()}>Download PDF</button>
    {error&&<p role="alert">The preview PDF could not be generated. No customer changes were made.</p>}
    <ReceptionFloorPlanCanvas plan={plan} tables={tables} event={event} attendingCount={attendingCount}
      generatedAt={generatedAt} a4Ref={documentRef} backgroundUrl={backgroundUrl} readOnly
      fitViewport onChange={()=>undefined}/>
  </section>;
}
