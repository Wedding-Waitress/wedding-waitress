import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, Printer } from 'lucide-react';
import type { Event } from '@/hooks/useEvents';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { Guest } from '@/hooks/useGuests';
import { useToast } from '@/hooks/use-toast';
import { openPdfPrintFrame, type PdfPrintJob } from '@/lib/pdfPrint';
import { savePdfAsync } from '@/lib/pdfExportUtils';
import styles from '@/pages/TablesPage.module.css';

export function TablesExportControls({event,tables,guests,loading}:{event?:Event;tables:TableWithGuestCount[];guests:Guest[];loading:boolean}) {
  const [action,setAction]=useState<'print'|'download'|null>(null);
  const selected=useRef(event?.id); selected.current=event?.id;
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const {toast}=useToast();
  const run=async (next:'print'|'download')=>{
    if(!event||loading||action)return;
    const id=event.id,isCurrent=()=>mounted.current&&selected.current===id;
    let job:PdfPrintJob|undefined;
    setAction(next);
    try{
      if(next==='print')job=openPdfPrintFrame();
      const {createTablesDocument}=await import('@/lib/tablesDocument');
      const pdf=await createTablesDocument({event,tables,guests},isCurrent);
      if(!isCurrent())throw Error('The selected event changed. Please export again.');
      if(job)await job.print(pdf.output('blob'),isCurrent);
      else await savePdfAsync(pdf,`${event.name.replace(/[/:*?"<>|]/g,'')}-Tables.pdf`);
    }catch(error){job?.close();toast({title:next==='print'?'Print Failed':'Export Failed',description:error instanceof Error?error.message:'Could not prepare your tables.',variant:'destructive'});}
    finally{if(mounted.current)setAction(null);}
  };
  return <div data-export-controls-panel className={styles.tablesExportControls}>
    <span data-export-controls-heading><Printer size={16} aria-hidden="true"/>Export Controls</span>
    <div className={styles.tablesExportButtons}>
      <button type="button" className={styles.tablesExportButton} disabled={!event||loading||!!action} onClick={()=>void run('print')}>
        {action==='print'?<LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>:<Printer size={16} aria-hidden="true"/>}Print
      </button>
      <button type="button" className={styles.tablesExportButton} disabled={!event||loading||!!action} onClick={()=>void run('download')}>
        {action==='download'?<LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>:<Download size={16} aria-hidden="true"/>}Download PDF
      </button>
    </div>
  </div>;
}
