import { wrapGuestbookText, guestbookEventDate } from './guestbookCardText';
import type { GuestbookPdfMessage, GuestbookPdfEvent } from './guestbookMessagePdf';
export const GUESTBOOK_CARD_SIZE = { widthPx:1200, heightPx:1800, widthMm:101.6, heightMm:152.4 } as const;
const INK='#3d261e', PAPER='#faf6ef', GOLD='#ad8b4e';
export const GUESTBOOK_CARD_BORDER_MM=5;
const BORDER=GUESTBOOK_CARD_BORDER_MM*GUESTBOOK_CARD_SIZE.widthPx/GUESTBOOK_CARD_SIZE.widthMm;
const SERIF='Georgia,"Times New Roman","Segoe UI Emoji",serif';
const TITLE='"Wedding Waitress Playfair","Playfair Display",Georgia,serif';
export async function renderGuestbookMessageCards(message:GuestbookPdfMessage,event:GuestbookPdfEvent):Promise<HTMLCanvasElement[]> {
  await document.fonts.load('600 120px "Wedding Waitress Playfair"'); await document.fonts.ready;
  const measure=document.createElement('canvas').getContext('2d'); if(!measure)throw new Error('Message card drawing is unavailable.');
  const font=(size:number,italic=false,family=SERIF,weight=400)=>{measure.font=(italic?'italic ':'')+weight+' '+size+'px '+family};
  const lines=(text:string,width:number)=>wrapGuestbookText(text,width,s=>measure.measureText(s).width);
  const title=event.name?.trim()||'Event';let titleSize=124;font(titleSize,true,TITLE,600);
  while(measure.measureText(title).width>900&&titleSize>16){titleSize-=1;font(titleSize,true,TITLE,600)}
  const titleTop=185-titleSize*.56;
  const date=guestbookEventDate(event.date);const dateY=300;let dateSize=40;font(dateSize);
  while(measure.measureText(date).width>880&&dateSize>18){dateSize-=1;font(dateSize)}
  const bodyTop=460,bodyBottom=1340;
  let bodySize=70;font(bodySize);let messageLines=lines(message.message,900);
  while(messageLines.length*bodySize*1.22>bodyBottom-bodyTop&&bodySize>24){bodySize-=2;font(bodySize);messageLines=lines(message.message,900)}
  const perPage=Math.max(1,Math.floor((bodyBottom-bodyTop)/(bodySize*1.22)));
  let signatureSize=82;font(signatureSize,true);let signature=lines(message.name?.trim()||'Anonymous guest',880);
  while(signature.length>2&&signatureSize>38){signatureSize-=2;font(signatureSize,true);signature=lines(message.name?.trim()||'Anonymous guest',880)}
  const result:HTMLCanvasElement[]=[];
  for(let start=0;start<Math.max(1,messageLines.length);start+=perPage){
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1800;canvas.dataset.printMirrorDocument='guestbook-message-card';
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=PAPER;ctx.fillRect(0,0,1200,1800);
    let seed=26;ctx.fillStyle='rgba(90,65,35,.025)';for(let i=0;i<6500;i++){seed=(1664525*seed+1013904223)>>>0;const x=seed%1200;seed=(1664525*seed+1013904223)>>>0;ctx.fillRect(x,seed%1800,1,1)}
    ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.strokeRect(BORDER,BORDER,1200-2*BORDER,1800-2*BORDER);
    ctx.fillStyle=INK;ctx.textAlign='center';ctx.textBaseline='top';
    ctx.font='italic 600 '+titleSize+'px '+TITLE;ctx.fillText(title,600,titleTop,900);
    ctx.font='400 '+dateSize+'px '+SERIF;ctx.fillText(date,600,dateY,880);
    const chunk=messageLines.slice(start,start+perPage);const height=chunk.length*bodySize*1.22;
    ctx.font='400 '+bodySize+'px '+SERIF;chunk.forEach((line,i)=>ctx.fillText(line,600,bodyTop+(bodyBottom-bodyTop-height)/2+i*bodySize*1.22));
    ctx.font='italic 400 '+signatureSize+'px '+SERIF;signature.forEach((line,i)=>ctx.fillText(line,600,1530-signature.length*signatureSize*1.08+i*signatureSize*1.08));
    ctx.save();ctx.translate(0,100);
    ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(490,1585);ctx.bezierCurveTo(550,1545,615,1535,710,1505);ctx.stroke();
    const leaf=(x:number,y:number,dx:number,dy:number)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.25-dy*.2,y+dy*.25+dx*.2,x+dx,y+dy);ctx.quadraticCurveTo(x+dx*.65+dy*.2,y+dy*.65-dx*.2,x,y);ctx.stroke();};
    leaf(540,1558,35,-60);leaf(577,1548,51,-66);leaf(616,1536,77,-16);leaf(555,1554,42,40);leaf(608,1539,55,32);
    ctx.restore();
    result.push(canvas);
  }
  return result;
}
