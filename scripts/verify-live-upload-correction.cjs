// Live uploads use the public anonymous key and normal RPC/RLS checks.
// This is a transport harness, not real-device/browser verification.
const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');
const esbuild = require('esbuild');
const root = path.resolve('work/upload-live-test');
const phase = process.argv[2] || 'prepare';
fs.mkdirSync(root,{recursive:true});
const fixture = JSON.parse(fs.readFileSync(path.join(root,'fixture.json'),'utf8'));
const baseline = fs.readFileSync('work/upload-production-baseline/assets/index-CFWgM6CR.js','utf8');
const ast = espree.parse(baseline,{ecmaVersion:'latest',sourceType:'module'});
let anon;
function walk(node) {
  if(!node||typeof node!=='object')return;
  if(node.type==='VariableDeclarator'&&node.id.name==='Q1')anon=node.init.callee.object.value.trim();
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}
walk(ast);
if(!anon || JSON.parse(Buffer.from(anon.split('.')[1],'base64url').toString()).role!=='anon')throw Error('Expected public anonymous key');
const project='https://xytxkidpourwdbzzwcdp.supabase.co';
const storageFile=path.join(root,'tab-state.json');
const saved=fs.existsSync(storageFile)?JSON.parse(fs.readFileSync(storageFile,'utf8')):{};
const memory=new Map(Object.entries(saved));
const store={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{memory.set(k,v);fs.writeFileSync(storageFile,JSON.stringify(Object.fromEntries(memory)));},removeItem:k=>{memory.delete(k);fs.writeFileSync(storageFile,JSON.stringify(Object.fromEntries(memory)));},get length(){return memory.size},key:i=>Array.from(memory.keys())[i]??null};
global.sessionStorage=store;global.localStorage=store;global.window=global;global.location={href:'https://weddingwaitress.com.au/gallery/test'};
global.__liveUpload={project,anon,fixture};
const requests=[];let interrupt=false;
class FetchXHR {
  constructor(){this.headers={};this.upload={};this.controller=new AbortController();}
  open(method,url){this.method=method;this.url=url;}
  setRequestHeader(k,v){const key=k.toLowerCase();this.headers[key]=this.headers[key]?`${this.headers[key]}, ${v}`:v;}
  getResponseHeader(k){return this.responseHeaders?.get(k)??null;}
  async send(body){
    const auth=this.headers.authorization;
    if(!auth?.startsWith('Bearer ')||auth.includes(','))throw Error('Authorization must be set exactly once');
    try{
      if(interrupt&&this.method==='PATCH')throw Error('Simulated interruption');
      const started=performance.now();const response=await fetch(this.url,{method:this.method,headers:this.headers,body,signal:this.controller.signal});
      this.status=response.status;this.responseHeaders=response.headers;this.responseText=await response.text();
      requests.push({method:this.method,status:response.status,ms:Math.round(performance.now()-started),offset:response.headers.get('upload-offset')});
      this.onload?.();
    }catch(error){this.status=0;this.onerror?.(new Error('Transport interrupted'));}
  }
  abort(){this.controller.abort();}
}
global.XMLHttpRequest=FetchXHR;
async function rpc(name,args){const response=await fetch(`${project}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:anon,authorization:`Bearer ${anon}`,'content-type':'application/json'},body:JSON.stringify(args)});const body=await response.json();if(!response.ok)throw Object.assign(new Error('RPC failed'),{status:response.status,code:body.code});return body;}
async function main(){
  await esbuild.build({stdin:{contents:'export {useGuestMediaUpload} from "./src/hooks/useGuestMediaUpload";export {guestUploadCheckpoint} from "./src/lib/guestUploadCheckpoint";export {resetHarness,harnessState} from "react";',resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'browser',target:'es2020',outfile:path.join(root,'runtime.cjs'),plugins:[{name:'harness',setup(build){
    build.onResolve({filter:/^(react|react-i18next|@\/integrations\/supabase\/client)$/},a=>({path:a.path,namespace:'harness'}));
    build.onLoad({filter:/.*/,namespace:'harness'},a=>({loader:'js',resolveDir:process.cwd(),contents:a.path==='react'?'let states=[],index=0;export const resetHarness=()=>{states=[];index=0};export const harnessState=()=>states;export const useRef=v=>({current:v});export const useCallback=f=>f;export const useState=v=>{const i=index++;states[i]=v;return[v,n=>states[i]=typeof n==="function"?n(states[i]):n]};':a.path==='react-i18next'?'export const useTranslation=()=>({t:key=>key});':'import {createClient} from "@supabase/supabase-js";const c=globalThis.__liveUpload;export const SUPABASE_URL=c.project,SUPABASE_PUBLISHABLE_KEY=c.anon;export const supabase=createClient(c.project,c.anon,{auth:{persistSession:false,autoRefreshToken:false}});'}));
    build.onResolve({filter:/^@\//},a=>({path:path.resolve('src',a.path.slice(2)+'.ts')}));
  }}]});
  const runtime=require(path.join(root,'runtime.cjs'));
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=','base64');
  const video=fs.readFileSync('public/videos/wedding-waitress-home-hero-web-silent.mp4');
  const inputs=[{name:'Upload release verification - image.png',bytes:image,mime:'image/png',kind:'photo',duration:null},{name:'Upload release verification - video.mp4',bytes:video,mime:'video/mp4',kind:'video',duration:79},{name:'Upload release verification - resumed video.mp4',bytes:video,mime:'video/mp4',kind:'video',duration:79}];
  const files=inputs.map(f=>({file:new File([f.bytes],f.name,{type:f.mime,lastModified:1700000000000}),fileName:f.name,ok:true,kind:f.kind,mime:f.mime,size:f.bytes.length,duration:f.duration}));
  const opts={token:fixture.token,uploaderName:'Upload release verification (test)',album:'Other',limits:{}};
  if(phase==='prepare'){
    const scope=JSON.stringify([opts.token,opts.uploaderName,opts.caption,opts.guestbookMessage,opts.album]);const rows=[];
    for(const file of files){const c=await runtime.guestUploadCheckpoint(file.file,scope);const [row]=await rpc('register_event_media_upload_v2',{_token:fixture.token,_request_id:c.requestId,_upload_secret:c.secret,_kind:file.kind,_mime_type:file.mime,_byte_size:file.size,_duration_sec:file.duration,_uploader_name:opts.uploaderName,_caption:null,_guestbook_message:null,_filename:file.file.name,_album:'Other'});rows.push(row);}
    fs.writeFileSync(path.join(root,'reservations.json'),JSON.stringify(rows));
    console.log(JSON.stringify({stage:'registration',status:200,reservations:rows.length,sixHourWindows:rows.every(r=>Date.parse(r.upload_token_expires_at)>Date.now()+5*3600000)}));return;
  }
  // Reproduce the old invalid combined Authorization against live Storage,
  // using a fixture path; rejection happens before creating a Storage object.
  const rows=JSON.parse(fs.readFileSync(path.join(root,'reservations.json'),'utf8'));
  const bad=await fetch('https://xytxkidpourwdbzzwcdp.storage.supabase.co/storage/v1/upload/resumable',{method:'POST',headers:{apikey:anon,authorization:`Bearer ${anon}, Bearer ${anon}`,'tus-resumable':'1.0.0','upload-length':'68','upload-metadata':`bucketName ${Buffer.from('event-media').toString('base64')},objectName ${Buffer.from(rows[0].storage_path).toString('base64')}`}});
  const rejection=await bad.json();if(bad.status!==400)throw Error('Expected old-header rejection');
  const results=[];
  for(let i=0;i<files.length;i++){
    runtime.resetHarness();const hook=runtime.useGuestMediaUpload();const started=performance.now();
    if(i===2)interrupt=true;
    await hook.uploadFiles([files[i]],opts);
    if(i===2){if(runtime.harnessState()[0][0].status!=='error')throw Error('Expected interrupted transfer');interrupt=false;await hook.uploadFiles([files[i]],opts);}
    const status=runtime.harnessState()[0][0].status;if(status!=='done')throw Error(`Live upload failed at ${runtime.harnessState()[0][0].phase}`);
    const checkpoint=await runtime.guestUploadCheckpoint(files[i].file,JSON.stringify([opts.token,opts.uploaderName,opts.caption,opts.guestbookMessage,opts.album]));
    const replay=await rpc('finalize_event_media_upload',{_item_id:checkpoint.registration.item_id,_upload_token:checkpoint.registration.upload_token});if(replay!==true)throw Error('Finalisation replay failed');
    results.push({kind:files[i].kind,bytes:files[i].size,status,interruptedAndResumed:i===2,ms:Math.round(performance.now()-started)});
  }
  const report={transportHarness:true,realDevice:false,anonymousRls:true,oldCombinedHeaderStatus:bad.status,oldCombinedHeaderErrorCode:rejection.error||rejection.code||'AccessDenied',results,requests};
  fs.writeFileSync('artifacts/upload-live-correction-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(JSON.stringify({stage:'live-verification',status:error.status,code:error.code,failed:true}));process.exit(1)});
