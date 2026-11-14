// Browser layout test of the mock roster, never connected to application accounts.
const fs=require('node:fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const target=await(await fetch('http://127.0.0.1:9426/json/new?about:blank',{method:'PUT'})).json();
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:'http://127.0.0.1:8184'});
  for(let i=0;i<50;i++){await sleep(100);if(await evaluate('!!document.querySelector("#team-allowance-heading")'))break;}
  const results=[];
  for(const [name,width] of [['desktop',1280],['tablet',768],['mobile',390]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<640});await sleep(200);
   const result=await evaluate(`(()=>{const heading=document.querySelector('#team-allowance-heading');const instruction=heading.closest('section');const roster=document.querySelector('[role="table"]');return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,instructionsBeforeRoster:!!(instruction.compareDocumentPosition(roster)&Node.DOCUMENT_POSITION_FOLLOWING),text:instruction.innerText,columns:getComputedStyle(document.querySelector('[role="rowgroup"]')||document.querySelector('[role="row"]')).gridTemplateColumns,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled}))}})()`);
   assert.equal(result.overflow,false,name);assert.equal(result.instructionsBeforeRoster,true);
   assert.match(result.text,/5 people total/);assert.match(result.text,/14 days/);assert.match(result.text,/Occupied places\s+2/i);assert.match(result.text,/Reserved places\s+1/i);assert.match(result.text,/Remaining places\s+2/i);
   assert.ok(result.buttons.some(b=>b.text==='Invite User'&&!b.disabled));
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`artifacts/team-access-v2/${name}.png`,Buffer.from(shot.data,'base64'));
   results.push({name,...result});
  }
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Manage Users').click()`);await sleep(300);
  assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Revoke')`),true);
  assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/team-access-v2/browser-results.json',JSON.stringify({mock:true,realAccountsTested:false,results},null,2));
  console.log('PASS mock browser: desktop 1280px, tablet 768px, mobile 390px; instructions before roster; counts; visible owner controls; mobile Manage Users dialog without horizontal overflow.');
 }finally{await send('Browser.close').catch(()=>{});ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
