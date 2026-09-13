import React, { useRef, useState } from 'react';
import { CeremonyFloorPlanA4 } from '@/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4';
import type { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import type { Event } from '@/hooks/useEvents';
import { exportCeremonyPreviewToPdf } from '@/lib/ceremonyFloorPlanPdfExporter';

export type AdminPreviewDocumentEvent = Pick<Event, 'name'|'date'|'venue'|'ceremony_date'|'ceremony_venue'|'ceremony_start_time'|'ceremony_finish_time'> & Partial<Pick<Event,'start_time'|'finish_time'|'partner1_name'|'partner2_name'>>;
export function AdminReadOnlyCeremonyPlan({plan,event}:{plan:CeremonyFloorPlan|null;event:AdminPreviewDocumentEvent}) {
  const documentRef=useRef<HTMLDivElement>(null);
  const [generatedAt]=useState(()=>new Date());
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  if (!plan) return <p>No saved Ceremony Floor Plan recorded.</p>;
  const download=async()=>{
    if (!documentRef.current||busy) return;
    setBusy(true);setError(false);
    try { await exportCeremonyPreviewToPdf({pageElement:documentRef.current,eventName:event.name,eventDate:event.ceremony_date??event.date}); }
    catch { setError(true); } finally { setBusy(false); }
  };
  return <section aria-label="Read-only Ceremony Floor Plan">
    <button onClick={()=>void download()} disabled={busy}>Download PDF</button>
    {error&&<p role="alert">The preview PDF could not be generated. No customer changes were made.</p>}
    <div style={{overflowX:'auto'}}>
      {/* Existing renderer consumes only these document event fields, never session data. */}
      <CeremonyFloorPlanA4 ref={documentRef} floorPlan={plan} event={event as Event} generatedAt={generatedAt}/>
    </div>
  </section>;
}
