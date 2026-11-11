// Headless Chrome with a simulated camera. Never clicks Save or uploads user data.
const fs=require('node:fs');
const origin=process.argv[2]||'http://127.0.0.1:8181';
const tag=origin.startsWith('http://127')?'local':'live';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const target=await(await fetch('http://127.0.0.1:9425/json/new?about:blank',{method:'PUT'})).json();
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map(),errors=[];
 ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Browser evaluation failed');return r.result.value;};
 try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/gallery/PWgK-9RsQGGR3pV_r8Dy_-mI_9MbpwII?tab=booth'});
  let ready=false;for(let n=0;n<100;n++){await sleep(300);ready=await evaluate('(()=>{const input=document.querySelector("#pb-name");if(input&&!input.getClientRects().length)[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Photo Booth")?.click();return !!input?.getClientRects().length;})()');if(ready)break;}
  if(!ready)throw Error('Photo Booth failed to render: '+JSON.stringify({errors,body:await evaluate('document.body.innerText.slice(-1800)'),debug:await evaluate('({buttons:[...document.querySelectorAll("button")].map(b=>({text:b.textContent,disabled:b.disabled})),ancestors:(()=>{let n=document.querySelector("#pb-name"),a=[];while(n){a.push({tag:n.tagName,cls:n.className,display:getComputedStyle(n).display,hidden:n.hidden});n=n.parentElement}return a})()})')}));
  const results=[];
  for(const [name,width,mobile] of [['desktop',1280,false],['mobile',390,true]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile});await sleep(400);
   const result=await evaluate(`(()=>{const input=document.querySelector('#pb-name');const panel=input.closest('[data-public-photo-booth-surface="form"]');const video=panel.querySelector('video');const label=document.querySelector('label[for="pb-name"]');const start=[...panel.querySelectorAll('button')].find(b=>/Start Photo Strip|Start Photo Booth/.test(b.textContent));const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}};return {label:label.textContent,start:start.textContent,preview:box(video),name:box(input),button:box(start),order:!!(video.compareDocumentPosition(input)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(input.compareDocumentPosition(start)&Node.DOCUMENT_POSITION_FOLLOWING),direct:input.parentElement.nextElementSibling.firstElementChild===start,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
   if(!result.order||!result.direct||result.preview.bottom>result.name.top||result.name.bottom>result.button.top||result.overflow)throw Error('Incorrect '+name+' layout '+JSON.stringify(result));
   results.push({viewport:name,...result});
   await evaluate('document.querySelector("#pb-name").scrollIntoView({block:"center"})');
   const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`.codex-deploy-photo-video/${tag}-${name}.png`,Buffer.from(screenshot.data,'base64'));
  }
  let capture=null;
  if(process.argv.includes('--capture')){
   await evaluate(`(()=>{const input=document.querySelector('#pb-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Release verification');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
   await sleep(300);
   const clicked=await evaluate(`(()=>{const panel=document.querySelector('#pb-name').closest('[data-public-photo-booth-surface="form"]');const start=[...panel.querySelectorAll('button')].find(b=>b.textContent.includes('Start Photo Strip'));if(start.disabled)return false;start.click();return true;})()`);
   if(!clicked)throw Error('Simulated camera not ready');
   const countdowns=new Set(),frames=new Set();let preview=null;
   for(let n=0;n<240;n++){
    await sleep(200);
    const state=await evaluate(`(()=>{const panel=document.querySelector('#pb-name').closest('[data-public-photo-booth-surface="form"]');const count=panel.querySelector('span.text-white.font-bold')?.textContent;const progress=[...panel.querySelectorAll('[data-photo-booth-slot]')].filter(e=>e.textContent.trim()).length;const image=panel.querySelector('img[alt="Photo strip preview"]');return {count,progress,preview:image?.complete?{width:image.naturalWidth,height:image.naturalHeight}:null};})()`);
    if(state.count==='7')countdowns.add(state.progress+1);
    if(state.progress)frames.add(state.progress);
    if(state.preview){preview=state.preview;break;}
   }
   capture={countdowns:[...countdowns],completedCaptureCounts:[...frames],strip:preview,saved:false};
   if(countdowns.size!==4||!preview||preview.width!==1200||preview.height!==1800)throw Error('Four-capture browser regression '+JSON.stringify(capture));
  }
  const audit={origin,simulatedCamera:true,actualIPhone:false,submissionsMade:false,results,capture,runtimeErrors:errors};
  if(errors.length)throw Error('Browser runtime errors '+JSON.stringify(errors));
  fs.writeFileSync(`.codex-deploy-photo-video/${tag}-browser-verification.json`,JSON.stringify(audit,null,2));console.log(JSON.stringify(audit));
 }finally{await send('Page.close').catch(()=>{});ws.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
