export const DOCUMENT_EVENT_TITLE_STYLE = {
 fontFamily: '"Wedding Waitress Playfair", "Playfair Display", Georgia, serif',
 fontWeight: 600,
} as const;

let fontData:Promise<string>|undefined;
function loadDocumentEventTitleFont(){
 fontData??=fetch('/fonts/playfair-display/playfair-display-semibold.ttf').then(async response=>{
  if(!response.ok)throw new Error('Event title font could not load');
  const blob=await response.blob();
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Event title font could not be embedded'));reader.readAsDataURL(blob);});
 }).catch(error=>{fontData=undefined;throw error;});
 return fontData;
}
export const PDF_EVENT_TITLE_FONT = 'WeddingWaitressPlayfair';
export async function registerDocumentEventTitleFont(pdf:import('jspdf').jsPDF){
 const data=await loadDocumentEventTitleFont();
 pdf.addFileToVFS('ww-playfair-semibold.ttf',data.slice(data.indexOf(',')+1));
 pdf.addFont('ww-playfair-semibold.ttf',PDF_EVENT_TITLE_FONT,'normal');
}
/** SVG document captures are isolated images, so embed the same font used by
 * the live authoritative page rather than relying on the parent page's CSS. */
export async function embedDocumentEventTitleFont(svg:SVGElement){
 const style=document.createElementNS('http://www.w3.org/2000/svg','style');
 style.textContent=`@font-face{font-family:"Wedding Waitress Playfair";src:url("${await loadDocumentEventTitleFont()}") format("truetype");font-weight:600;font-style:normal;}`;
 svg.prepend(style);
}
