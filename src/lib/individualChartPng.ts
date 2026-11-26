import type jsPDF from 'jspdf';

/** Embed the browser's opaque RGB PNG stream directly. Re-encoding a 600-DPI
 * page in JavaScript is expensive and cannot improve its lossless pixels. */
export function opaquePngImageData(bytes:Uint8Array){
 const read=(offset:number)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(offset);
 if(bytes.length<33||![137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)||read(8)!==13||String.fromCharCode(...bytes.subarray(12,16))!=='IHDR'||bytes[24]!==8||bytes[25]!==2||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)return null;
 const width=read(16),height=read(20);if(!width||!height)return null;
 const chunks:Uint8Array[]=[];let total=0,ended=false;
 for(let offset=8;offset+12<=bytes.length;){const length=read(offset);if(length>bytes.length-offset-12)return null;const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(type==='tRNS')return null;if(type==='IDAT'){const chunk=bytes.subarray(offset+8,offset+8+length);chunks.push(chunk);total+=length;}if(type==='IEND'){ended=true;break;}offset+=length+12;}
 if(!ended||!total)return null;
 const data=new Uint8Array(total);let position=0;for(const chunk of chunks){data.set(chunk,position);position+=chunk.length;}
 let binary='';for(let start=0;start<data.length;start+=8192)binary+=String.fromCharCode(...data.subarray(start,start+8192));
 return {data:binary,width,height,colorSpace:'DeviceRGB',bitsPerComponent:8,filter:'FlateDecode',decodeParameters:`/Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${width}`};
}
export async function addIndividualChartPageImage(pdf:jsPDF,canvas:HTMLCanvasElement,widthMm:number,heightMm:number){
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to encode the chart page.')),'image/png'));
 const bytes=new Uint8Array(await blob.arrayBuffer());const image=opaquePngImageData(bytes);
 if(!image){pdf.addImage(bytes,'PNG',0,0,widthMm,heightMm,undefined,'FAST');return;}
 // Only this PDF instance is changed, for the duration of this synchronous call.
 const instance=pdf as unknown as {processPNG:(...args:unknown[])=>unknown};const original=instance.processPNG;
 instance.processPNG=(_data,index,alias)=>({...image,index,alias});
 try{pdf.addImage(bytes,'PNG',0,0,widthMm,heightMm,undefined,'FAST');}finally{instance.processPNG=original;}
}
