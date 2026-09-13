// Preserve the two distinct existing customer export layouts; this is not a
// preview/print/PDF mirror declaration or a redesigned printable document.
function requirePng(qrDataUrl:string){if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qrDataUrl))throw Error('Generated PNG required');}
function loadedPng(qrDataUrl:string){requirePng(qrDataUrl);return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=qrDataUrl;});}
export async function createCustomerQrJPG(qrDataUrl:string){
 const image=await loadedPng(qrDataUrl),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 canvas.width=image.width;canvas.height=image.height;ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
 return canvas.toDataURL('image/jpeg',0.9);
}
export async function createCustomerQrSVG(qrDataUrl:string){
 const image=await loadedPng(qrDataUrl);
 return new Blob([`
          <svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}">
            <image href="${qrDataUrl}" width="${image.width}" height="${image.height}"/>
          </svg>
        `],{type:'image/svg+xml'});
}
export async function createCustomerQrPDF(qrDataUrl:string){
 requirePng(qrDataUrl);
 const {PDF_DEFAULT_OPTIONS}=await import('@/lib/pdfExportUtils');
 const {default:jsPDF}=await import('jspdf');
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',...PDF_DEFAULT_OPTIONS});
 await new Promise<void>((resolve,reject)=>{
  const image=new Image();image.onload=()=>{try{pdf.addImage(image,'PNG',55,98.5,100,100);resolve();}catch(error){reject(error);}};image.onerror=reject;image.src=qrDataUrl;
 });return pdf;
}
export function customerQrPrintHTML(qrDataUrl:string,eventName:string){
 // Event names are text, not executable markup. Escaping preserves their
 // visible wording while preventing customer data from injecting print HTML.
 const name=eventName.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
 requirePng(qrDataUrl);
 return `<html><head><title>QR Code - ${name}</title><style>
 body { margin: 0; padding: 20px; text-align: center; }
 img { max-width: 100%; height: auto; }
 h1 { font-family: Arial, sans-serif; margin-bottom: 20px; }
 </style></head><body><h1>QR Code - ${name}</h1><img src="${qrDataUrl}" alt="QR Code" /></body></html>`;
}
export function printCustomerQr(qrDataUrl:string,eventName:string){
 const html=customerQrPrintHTML(qrDataUrl,eventName),printWindow=window.open('','_blank');
 if(!printWindow)throw Error('The browser blocked the QR print window');
 printWindow.document.write(html);printWindow.document.close();printWindow.print();
}
