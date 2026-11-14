// Wait for the shared title images and their wrapping to settle before measuring or exporting.
export async function waitForPhotoCardLayout(root:HTMLElement){
 await document.fonts.load('700 18px Manrope');await document.fonts.ready;
 let previous='';let stable=0;
 for(let attempt=0;attempt<120;attempt++){
 await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 const images=[...root.querySelectorAll('img')];const signature=images.map(img=>img.src+':'+img.clientWidth+':'+img.clientHeight).join('|');
 if(signature===previous&&images.every(img=>img.complete&&img.naturalWidth>0))stable++;else stable=0;previous=signature;
 if(stable>=3){const decoded=await Promise.all(images.map(img=>img.decode().then(()=>true,()=>false)));if(decoded.every(Boolean)&&images.every((img,index)=>img.src+':'+img.clientWidth+':'+img.clientHeight===signature.split('|')[index]))return;stable=0;}
 }
 throw new Error('Photo card images are still preparing. Please try again.');
}
