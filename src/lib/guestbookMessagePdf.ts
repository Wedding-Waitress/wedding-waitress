/** The same 4×6 keepsake renderer supplies message previews and PDF pages. */
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from './pdfExportUtils';
import { guestbookPdfFilename } from './guestbookFilename';
import { renderGuestbookMessageCards, GUESTBOOK_CARD_SIZE } from './guestbookMessageCard';
export {wrapGuestbookText,guestbookEventDate} from './guestbookCardText';
export interface GuestbookPdfMessage {
  seq?: number | null;
  name?: string | null;
  message: string;
  at?: string | null;
  hasRecording?: boolean;
}
export interface GuestbookPdfEvent { name?: string | null; date?: string | null }

export async function createGuestbookMessagePdf(message:GuestbookPdfMessage,event:GuestbookPdfEvent){
  const cards=await renderGuestbookMessageCards(message,event);
  const {default:jsPDF}=await import('jspdf');
  const size:[number,number]=[GUESTBOOK_CARD_SIZE.widthMm,GUESTBOOK_CARD_SIZE.heightMm];
  const pdf=new jsPDF({...PDF_DEFAULT_OPTIONS,unit:'mm',format:size,orientation:'portrait'});
  pdf.viewerPreferences({PrintScaling:'None',PickTrayByPDFSize:true});
  pdf.setProperties({title:(event.name||'Event')+' Guestbook',subject:'Wedding guestbook message card',creator:'Wedding Waitress'});
  for(let index=0;index<cards.length;index++){
    if(index)pdf.addPage(size,'portrait');
    pdf.addImage(cards[index].toDataURL('image/png'),'PNG',0,0,...size);await yieldToBrowser();
  }
  return pdf;
}
export async function downloadGuestbookMessagePdf(message:GuestbookPdfMessage,event:GuestbookPdfEvent){
  await savePdfAsync(await createGuestbookMessagePdf(message,event),guestbookPdfFilename(message.seq,event.name,event.date));
}
