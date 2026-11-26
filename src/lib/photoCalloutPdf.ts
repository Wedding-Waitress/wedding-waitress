import {waitForPhotoCardLayout} from './photoCalloutReady';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {PDF_DEFAULT_OPTIONS,savePdfAsync} from './pdfExportUtils';
export async function createPhotoCalloutPDF(root:HTMLElement,isCurrent=()=>true) {
 if(root.dataset.photoLayoutReady==='false')await new Promise<void>((resolve,reject)=>{const timeout=window.setTimeout(()=>{observer.disconnect();reject(new Error('Card layout is still preparing. Please try again.'));},10000);const observer=new MutationObserver(()=>{if(root.dataset.photoLayoutReady==='true'){clearTimeout(timeout);observer.disconnect();resolve();}});observer.observe(root,{attributes:true,attributeFilter:['data-photo-layout-ready']});});
 root.dispatchEvent(new Event('photo-export-start'));
 try{
 await waitForPhotoCardLayout(root);
 const pages=Array.from(root.querySelectorAll<HTMLElement>('[data-photo-sheet]'));
 if(!pages.length)throw new Error('No photo cards to export');
 const pdf=new jsPDF({...PDF_DEFAULT_OPTIONS,orientation:'portrait',unit:'mm',format:'a4'});
 for(let i=0;i<pages.length;i++){
  if(!isCurrent())throw new Error('The selected event or cards changed. Please export again.');
  if(Array.from(pages[i].querySelectorAll<HTMLElement>('[data-photo-card]')).some(card=>card.scrollHeight>card.clientHeight+2))throw new Error('A photo group is too long to fit. Please split it into two cards.');
  // Capture at 384 dpi so PDF text stays clear on high-density screens and when zoomed.
  const canvas=await html2canvas(pages[i],{scale:4,useCORS:true,backgroundColor:'#fff',onclone:doc=>{
   doc.querySelectorAll<HTMLElement>('[data-photo-scale]').forEach(node=>{node.style.transform='none';});
   doc.querySelectorAll<HTMLElement>('[data-photo-sheet]').forEach(node=>{node.style.boxShadow='none';node.dataset.photoOutput='print';});
  }});
  if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
 }
 if(!isCurrent())throw new Error('The selected event or cards changed. Please export again.');
 return pdf;
 }finally{root.dispatchEvent(new Event('photo-export-end'));}
}
export async function downloadPhotoCalloutPDF(root:HTMLElement,name:string,isCurrent=()=>true){const pdf=await createPhotoCalloutPDF(root,isCurrent);await savePdfAsync(pdf,`Wedding Waitress - ${name.replace(/[^a-z0-9 -]/gi,'').trim()||'Wedding'} - Photo Call Out Cards.pdf`);}

