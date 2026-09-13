import React,{useState} from 'react';
import {DJMCQuestionnaireSection} from '@/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection';
import type {DJMCQuestionnaire} from '@/types/djMCQuestionnaire';
import type {AdminPreviewDocumentEvent} from './AdminReadOnlyCeremonyPlan';
import {ReadOnlyAccountPreviewProvider} from '@/contexts/ReadOnlyAccountPreviewContext';

const noWrite=()=>undefined;
export function AdminReadOnlyQuestionnaire({questionnaire,event,eventId,customerId}:{questionnaire:DJMCQuestionnaire|null;event:AdminPreviewDocumentEvent;eventId:string;customerId?:string}) {
 const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});
 const [error,setError]=useState(false);
 const [busy,setBusy]=useState(false);
 const download=async(sectionId?:string)=>{
  if(!questionnaire||busy)return;setBusy(true);setError(false);
  try {
   const exporter=await import('@/lib/djMCQuestionnairePdfExporter');
   const documentEvent={...event,id:eventId};
   if(sectionId){const section=questionnaire.sections.find(value=>value.id===sectionId);if(section)await exporter.exportSectionPDF(section,documentEvent);}
   else await exporter.exportEntireQuestionnairePDF(questionnaire,documentEvent);
  } catch {setError(true);} finally {setBusy(false);}
 };
 if(!questionnaire)return <p>No saved DJ &amp; MC Questionnaire recorded.</p>;
 return <ReadOnlyAccountPreviewProvider customerId={customerId}><section aria-label="Read-only DJ and MC Questionnaire">
  <button disabled={busy} onClick={()=>void download()}>Download questionnaire PDF</button>
  {error&&<p role="alert">The saved questionnaire PDF could not be generated.</p>}
  {questionnaire.sections.length===0?<p>No saved questionnaire sections.</p>:questionnaire.sections.map(section=><DJMCQuestionnaireSection key={section.id}
   section={{...section,is_collapsed:collapsed[section.id]??section.is_collapsed}} eventId={eventId} disabled
   onUpdateSection={updates=>{if(typeof updates.is_collapsed==='boolean')setCollapsed(value=>({...value,[section.id]:updates.is_collapsed!}));}}
   onUpdateItem={noWrite} onAddItem={noWrite} onDeleteItem={noWrite} onDuplicateItem={noWrite}
   onReorderItems={noWrite} onResetToDefault={noWrite} onDuplicateSection={noWrite} onDeleteSection={noWrite}
   onRunUndoable={async()=>undefined} onDownloadSectionPDF={()=>void download(section.id)}/>)}
 </section></ReadOnlyAccountPreviewProvider>;
}
