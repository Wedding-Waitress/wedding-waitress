import type { Event } from '@/hooks/useEvents';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { Guest } from '@/hooks/useGuests';
import { wrapGuestbookText } from './guestbookMessagePdf';
import { PDF_DEFAULT_OPTIONS } from './pdfExportUtils';
import { fitDocumentFooterLogo } from './documentFooterLogo';
import { compareTableGuests } from './tableSeatingPlan';

const WIDTH = 794, HEIGHT = 1123, LEFT = 44, TOP = 94, BOTTOM = 1024, GAP = 16;
const CARD_WIDTH = (WIDTH - LEFT * 2 - GAP) / 2;
const FONT = 'Manrope, "Segoe UI", sans-serif';
type Person = { lines: string[]; seat: string; height: number };
export type TablesDocumentCard = { title: string[]; capacity: number; occupied: number; people: Person[]; continued: boolean; height: number; badgeWidth?:number; badgeHeight?:number };
export interface TablesDocumentInput { event: Event; tables: TableWithGuestCount[]; guests: Guest[]; generatedAt?: Date }

/** Pack whole cards in pairs, with at most three rows. Large guest lists are
 * continued in another card, never clipped or reduced to an unreadable font. */
export function paginateTablesCards(cards: TablesDocumentCard[], availableHeight = BOTTOM - TOP): TablesDocumentCard[][] {
  const pages: TablesDocumentCard[][] = []; let page: TablesDocumentCard[] = [], height = 0, rows = 0;
  for (let i = 0; i < cards.length; i += 2) {
    const pair = cards.slice(i, i + 2), rowHeight = Math.max(...pair.map(card => card.height));
    if (page.length && (rows === 3 || height + GAP + rowHeight > availableHeight)) { pages.push(page); page = []; height = 0; rows = 0; }
    page.push(...pair); height += (rows ? GAP : 0) + rowHeight; rows++;
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

const dateLabel = (value?: string | null) => {
  if (!value) return 'Date TBD';
  const date = new Date(`${value.slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Date TBD' : date.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
};
const timeLabel = (value?: string | null) => {
  if (!value) return 'Time TBD';
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]); return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};

/** This single canvas document is the source for both Print and Download PDF. */
export async function createTablesDocument({event,tables,guests,generatedAt=new Date()}: TablesDocumentInput, isCurrent=()=>true) {
  await Promise.all([document.fonts.load('400 13px Manrope'),document.fonts.load('600 18px Manrope'),document.fonts.load('600 26px "Wedding Waitress Playfair"')]);
  await document.fonts.ready;
  const logo = new Image(); logo.src = '/wedding-waitress-document-footer-dark-brown.png'; await logo.decode();
  const canvas = document.createElement('canvas'); canvas.width=WIDTH*2; canvas.height=HEIGHT*2;
  const ctx = canvas.getContext('2d'); if(!ctx) throw Error('Unable to prepare the Tables document.');
  const font = (size:number,weight=400,family=FONT) => {ctx.font=`${weight} ${size}px ${family}`;};
  const scopedGuests=guests.filter(g=>g.event_id===event.id);
  const scopedTables=tables.filter(t=>t.event_id===event.id);
  font(26,600,'"Wedding Waitress Playfair",Georgia,serif');
  const eventLines=wrapGuestbookText(event.name,WIDTH-LEFT*2,s=>ctx.measureText(s).width);
  const info:string[]=[];
  if(event.ceremony_enabled!==false) info.push(`Ceremony: ${dateLabel(event.ceremony_date)} | ${event.ceremony_venue||'Venue TBD'} | ${timeLabel(event.ceremony_start_time)} – ${timeLabel(event.ceremony_finish_time)}`);
  if(event.reception_enabled!==false) info.push(`Reception: ${dateLabel(event.date)} | ${event.venue||'Venue TBD'} | ${timeLabel(event.start_time)} – ${timeLabel(event.finish_time)}`);
  const detailsText=['Tables',...info,`Total Tables: ${scopedTables.length}    Total Guests: ${scopedGuests.length}`].join(' - ');
  font(11);
  const detailsFont=Math.max(9,Math.min(11,11*(WIDTH-LEFT*2)/Math.max(1,ctx.measureText(detailsText).width)));
  font(detailsFont);
  // Ordinary event details occupy one line. Very long custom venue names
  // wrap rather than losing information or becoming illegibly small.
  const detailsLines=wrapGuestbookText(detailsText,WIDTH-LEFT*2,s=>ctx.measureText(s).width);
  const detailsY=43+(eventLines.length-1)*26+24;
  const separatorY=detailsY+(detailsLines.length-1)*13+13;
  const bodyTop=separatorY+14,availableHeight=BOTTOM-bodyTop;
  if(availableHeight<150)throw Error('The event heading is too long for the Tables document.');
  const cards: TablesDocumentCard[]=[];
  for(const table of scopedTables) {
    const members=scopedGuests.filter(g=>g.table_id===table.id).sort(compareTableGuests);
    font(13);const countWidth=ctx.measureText(`${members.length}/${table.limit_seats} guests`).width;
    font(18,600);
    const title=wrapGuestbookText(table.name,CARD_WIDTH-28-countWidth-12-24,s=>ctx.measureText(s).width);
    const badgeWidth=Math.max(44,...title.map(line=>ctx.measureText(line).width+24));
    const badgeHeight=Math.max(36,title.length*22+12),header=30+badgeHeight;
    font(13);
    const people=members.map(g=>{const lines=wrapGuestbookText([g.first_name,g.last_name].filter(Boolean).join(' '),CARD_WIDTH-110,s=>ctx.measureText(s).width);return {lines,seat:g.seat_no==null?'Unassigned':`Seat ${g.seat_no}`,height:Math.max(22,lines.length*18+4)};});
    let part:Person[]=[],height=header,continued=false;
    const append=()=>{cards.push({title,capacity:table.limit_seats,occupied:members.length,people:part,continued,badgeWidth,badgeHeight,height:Math.max(120,height+8)});part=[];height=header+17;continued=true;};
    for(const person of people){
      // Even exceptionally long names can continue without dropping text.
      const chunkSize=Math.max(1,Math.floor((availableHeight-header-40)/18));
      for(let line=0;line<person.lines.length;line+=chunkSize){
        const lines=person.lines.slice(line,line+chunkSize),entry={...person,lines,height:Math.max(22,lines.length*18+4)};
        if(part.length&&height+entry.height+8>availableHeight)append();
        part.push(entry);height+=entry.height;
      }
    }
    append();
  }
  const pages=paginateTablesCards(cards,availableHeight),{default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF({...PDF_DEFAULT_OPTIONS,unit:'mm',format:'a4'});
  pdf.setProperties({title:`${event.name} — Tables`,creator:'Wedding Waitress'});
  const timestamp=generatedAt.toLocaleString('en-AU',{timeZone:event.event_timezone||'Australia/Sydney',day:'2-digit',month:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'});
  const drawText=(text:string,x:number,y:number,size:number,weight=400,align:CanvasTextAlign='left')=>{font(size,weight);ctx.textAlign=align;ctx.fillStyle='#000';ctx.fillText(text,x,y);};
  for(let index=0;index<pages.length;index++){
    if(!isCurrent())throw Error('The selected event changed. Please export again.');
    ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textBaseline='alphabetic';
    font(26,600,'"Wedding Waitress Playfair",Georgia,serif');ctx.textAlign='center';ctx.fillStyle='#000';
    eventLines.forEach((line,i)=>ctx.fillText(line,WIDTH/2,43+i*26));
    detailsLines.forEach((line,i)=>drawText(line,WIDTH/2,detailsY+i*13,detailsFont,400,'center'));
    ctx.strokeStyle='#2f1b14';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(LEFT,separatorY);ctx.lineTo(WIDTH-LEFT,separatorY);ctx.stroke();
    let y=bodyTop;
    const current=pages[index];
    for(let row=0;row<current.length;row+=2){
      const pair=current.slice(row,row+2),rowHeight=Math.max(...pair.map(card=>card.height));
      pair.forEach((card,column)=>{
        const x=LEFT+column*(CARD_WIDTH+GAP);
        ctx.fillStyle='#faf7f0';ctx.strokeStyle='#cdb99e';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,CARD_WIDTH,card.height,8);ctx.fill();ctx.stroke();
        const badgeWidth=card.badgeWidth!,badgeHeight=card.badgeHeight!;
        ctx.fillStyle='#f7f0e4';ctx.strokeStyle='#cdb99e';ctx.beginPath();ctx.roundRect(x+14,y+8,badgeWidth,badgeHeight,6);ctx.fill();ctx.stroke();
        ctx.textBaseline='middle';
        card.title.forEach((line,i)=>drawText(line,x+14+badgeWidth/2,y+8+badgeHeight/2+(i-(card.title.length-1)/2)*22,18,600,'center'));
        drawText(`${card.occupied}/${card.capacity} guests`,x+26+badgeWidth,y+8+badgeHeight/2,13);
        ctx.textBaseline='alphabetic';
        let cy=y+8+badgeHeight;
        if(card.continued){drawText('Continued',x+14,cy+14,11);cy+=17;}
        cy+=8;
        ctx.fillStyle='#e9dfcf';ctx.fillRect(x+14,cy,CARD_WIDTH-28,4);ctx.fillStyle=card.occupied>=card.capacity?'#55a447':'#967a59';ctx.fillRect(x+14,cy,(CARD_WIDTH-28)*Math.min(1,card.occupied/Math.max(1,card.capacity)),4);cy+=10;
        if(!card.people.length)drawText('No guests assigned',x+14,cy+12,13);
        for(const person of card.people){
          const rowHeight=person.height-4;
          ctx.strokeStyle='#dbc8ac';ctx.beginPath();ctx.roundRect(x+12,cy,CARD_WIDTH-24,rowHeight,4);ctx.stroke();
          ctx.textBaseline='middle';
          person.lines.forEach((line,l)=>drawText(line,x+19,cy+rowHeight/2+(l-(person.lines.length-1)/2)*18,13));
          drawText(person.seat,x+CARD_WIDTH-18,cy+rowHeight/2,11,400,'right');
          ctx.textBaseline='alphabetic';cy+=person.height;
        }
      });
      y+=rowHeight+GAP;
    }
    const size=fitDocumentFooterLogo(155,42);
    font(9);
    const footerMetrics=ctx.measureText(`Generated: ${timestamp} Page ${index+1} of ${pages.length}`);
    const footerCentre=1081+(footerMetrics.actualBoundingBoxDescent-footerMetrics.actualBoundingBoxAscent)/2;
    ctx.drawImage(logo,(WIDTH-size.width)/2,footerCentre-size.height/2,size.width,size.height);
    drawText(`Generated: ${timestamp}`,LEFT,1081,9);drawText(`Page ${index+1} of ${pages.length}`,WIDTH-LEFT,1081,9,400,'right');
    if(index)pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
  }
  return pdf;
}
