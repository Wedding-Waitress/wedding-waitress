import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import copy from '@/i18n/locales/en/common.json';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),upload:vi.fn(),compose:vi.fn(),stop:vi.fn(),getUserMedia:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('@/hooks/usePhotoBoothUpload',()=>({usePhotoBoothUpload:()=>({upload:mocks.upload,uploading:false})}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string,args:any={})=>{
 let value:any=key.split('.').reduce((v:any,k)=>v?.[k],copy)||key;
 for(const [k,v] of Object.entries(args)) value=value.replaceAll(`{{${k}}}`,String(v));
 return value;
}})}));
vi.mock('@/lib/photoBoothTemplate',async importOriginal=>({...await importOriginal<any>(),composeStripBlob:mocks.compose}));
import {GuestPhotoBooth} from './GuestPhotoBooth';
const gallery={event_id:'correct-event',event_name:'Wedding',event_date:'2027-03-19',is_open:true,photo_booth_enabled:true,photo_booth_mode:'single',password_required:false,show_branding:false};
let captures:Blob[];
let blobURLs:Map<Blob,string>;
const saved=vi.fn();
beforeEach(()=>{
 sessionStorage.clear(); captures=[];blobURLs=new Map();saved.mockReset();
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 mocks.rpc.mockReset().mockResolvedValue({data:[gallery]});
 mocks.upload.mockReset().mockResolvedValue(true);
 mocks.compose.mockReset().mockResolvedValue(new Blob(['strip'],{type:'image/jpeg'}));
 mocks.stop.mockReset();mocks.getUserMedia.mockReset().mockResolvedValue({getTracks:()=>[{stop:mocks.stop}],getVideoTracks:()=>[{readyState:'live'}]});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:mocks.getUserMedia}});
 Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,value:1});
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
 Object.defineProperty(navigator,'share',{configurable:true,value:vi.fn().mockRejectedValue({name:'AbortError'})});
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 vi.spyOn(HTMLVideoElement.prototype,'videoWidth','get').mockReturnValue(1920);
 vi.spyOn(HTMLVideoElement.prototype,'videoHeight','get').mockReturnValue(1440);
 vi.spyOn(HTMLMediaElement.prototype,'readyState','get').mockReturnValue(4);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({translate:vi.fn(),scale:vi.fn(),drawImage:vi.fn()} as any);
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>{const b=new Blob([`frame-${captures.length+1}`],{type:'image/jpeg'});captures.push(b);callback(b);});
 vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{const url=`blob:capture-${blobURLs.size+1}`;blobURLs.set(blob as Blob,url);return url;});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
async function open(){
 const view=render(<MemoryRouter><GuestPhotoBooth tokenProp="event-token" embedded onSaved={saved}/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Start Photo Strip'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText(/Please add your full name first/),{target:{value:'Guest'}});
 vi.useFakeTimers();return view;
}
async function tick(ms:number){await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});}
async function captureFour(){
 await tick(0); // Retake waits for the restarted camera's play() acknowledgement.
 const start=captures.length;
 const previousCompositions=mocks.compose.mock.calls.length;
 fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));
 // Every separate countdown must show all eight digits. No second Start tap.
 for(let frame=0;frame<4;frame++){
  expect(screen.getByText(`Photo ${frame+1} of 4`)).toBeInTheDocument();
  for(let second=8;second>=1;second--){expect(screen.getByText(String(second),{selector:'span.text-white'})).toBeInTheDocument();await tick(1000);}
  expect(captures).toHaveLength(start+frame+1);
  const slots=[...document.querySelectorAll('[data-photo-booth-slot]')];
  slots.forEach((slot,index)=>{
   const img=slot.querySelector('img');
   if(index<=frame){expect(img).toHaveAttribute('src',blobURLs.get(captures[start+index]));expect(img).toHaveAttribute('alt',`Captured photo ${index+1}`);}
   else expect(img).toBeNull();
  });
  await tick(frame===3?180:700);
 }
 expect(mocks.compose).toHaveBeenCalledTimes(previousCompositions+1);
 expect(mocks.compose.mock.calls.at(-1)![0]).toEqual(captures.slice(start));
 expect(new Set(captures.slice(start)).size).toBe(4);
 expect(screen.getByRole('img',{name:'Photo strip preview'})).toBeInTheDocument();
}
describe('existing four-photo capture and save sequence (simulated camera)',()=>{
 it('waits for valid name completion, dismisses Done/Start keyboard focus, and centres once without capturing early',async()=>{
  const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
  const view=await open();
  const input=screen.getByLabelText(/Please add your full name first/);
  const frame=view.container.querySelector('video')!.parentElement!;
  vi.spyOn(frame,'getBoundingClientRect').mockReturnValue({top:900,height:400} as DOMRect);
  input.focus();fireEvent.change(input,{target:{value:'Guest Name'}});await tick(1000);
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.keyDown(input,{key:'Enter'});expect(input).not.toHaveFocus();
  await tick(350);expect(scroll).toHaveBeenCalledTimes(1);expect(captures).toHaveLength(0);
  input.focus();fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));
  expect(input).not.toHaveFocus();expect(screen.getByText('8',{selector:'span.text-white'})).toBeInTheDocument();
  await tick(350);expect(scroll).toHaveBeenCalledTimes(2);expect(captures).toHaveLength(0);
 });
 it('focuses and marks an empty name without a banner or starting capture, then clears the cue for a valid name',async()=>{
  await open();
  const input=screen.getByLabelText(/Please add your full name first/);
  expect(input).toHaveAttribute('placeholder','e.g. Sarah Jones');
  fireEvent.change(input,{target:{value:'   '}});
  fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));
  expect(input).toHaveFocus();expect(input).toHaveAttribute('aria-invalid','true');
  expect(input.className).toContain('photoBoothNameRequired');
  fireEvent.change(input,{target:{value:'  '}});
  expect(input).toHaveAttribute('aria-invalid','true');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await tick(60000);
  expect(captures).toHaveLength(0);expect(mocks.compose).not.toHaveBeenCalled();expect(mocks.upload).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'Guest'}});
  expect(input).not.toHaveAttribute('aria-invalid');expect(input.className).not.toContain('photoBoothNameRequired');
  await captureFour();
 });
 it('overrides the legacy single default, counts down four times, keeps the camera alive and waits for all five saves',async()=>{
  await open();await captureFour();
  expect(mocks.getUserMedia).toHaveBeenCalledTimes(1);expect(mocks.stop).toHaveBeenCalledTimes(1);
  let finish!:(ok:boolean)=>void;
  mocks.upload.mockImplementationOnce(()=>Promise.resolve(true)).mockImplementationOnce(()=>Promise.resolve(true)).mockImplementationOnce(()=>Promise.resolve(true)).mockImplementationOnce(()=>Promise.resolve(true)).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  fireEvent.click(screen.getByRole('button',{name:'Download and Save'}));await tick(0);
  expect(mocks.upload).toHaveBeenCalledTimes(5);expect(saved).not.toHaveBeenCalled();expect(screen.queryByText(/Thanks,/)).not.toBeInTheDocument();
  await act(async()=>{finish(true);});
  expect(saved).toHaveBeenCalledTimes(1);expect(screen.getByText('Thanks, Guest!')).toBeInTheDocument();
  const calls=mocks.upload.mock.calls;
  expect(calls.map(c=>c[1].isStrip)).toEqual([true,false,false,false,false]);
  expect(calls.slice(1).map(c=>c[0])).toEqual(captures);
  expect(calls.every(c=>c[1].token==='event-token')).toBe(true);
  expect(new Set(calls.map(c=>c[1].filename)).size).toBe(5);
  fireEvent.click(screen.getByRole('button',{name:'Make another strip'}));
  expect(screen.getByRole('button',{name:'Start Photo Strip'})).toBeInTheDocument();
  await captureFour();
  fireEvent.click(screen.getByRole('button',{name:'Download and Save'}));await tick(0);
  expect(mocks.upload).toHaveBeenCalledTimes(10);expect(saved).toHaveBeenCalledTimes(2);
 });
 it('clears thumbnails for retake, releases their URLs, and fills a fresh strip in order',async()=>{
  await open();await captureFour();
  for(const blob of captures)expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobURLs.get(blob));
  fireEvent.click(screen.getByRole('button',{name:'Retake'}));await tick(0);
  expect(document.querySelectorAll('[data-photo-booth-slot] img')).toHaveLength(0);
  await captureFour();
 });
 it('reports partial saves and retries only unfinished outputs without changing filenames',async()=>{
  await open();await captureFour();
  mocks.upload.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  fireEvent.click(screen.getByRole('button',{name:'Download and Save'}));await tick(0);
  expect(saved).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toHaveTextContent('2 of 5 outputs saved');
  fireEvent.click(screen.getByRole('button',{name:'Download and Save'}));await tick(0);
  expect(mocks.upload).toHaveBeenCalledTimes(6);expect(saved).toHaveBeenCalledTimes(1);
  expect(mocks.upload.mock.calls[2][1].filename).toBe(mocks.upload.mock.calls[3][1].filename);
 });
 it('cancels between frames and prevents delayed timers from capturing or composing',async()=>{
  await open();fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));
  await tick(8000);expect(captures).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Stop'}));await tick(60000);
  expect(captures).toHaveLength(1);expect(mocks.compose).not.toHaveBeenCalled();expect(mocks.upload).not.toHaveBeenCalled();
  await captureFour();expect(mocks.compose.mock.calls[0][0]).toHaveLength(4);
 });
 it('does not accept a frame callback after Stop and releases the camera on unmount',async()=>{
  const view=await open();let finish!:BlobCallback;
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(callback=>{finish=callback;});
  fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));await tick(8000);
  fireEvent.click(screen.getByRole('button',{name:'Stop'}));
  await act(async()=>finish(new Blob(['late'])));await tick(60000);
  expect(mocks.compose).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Start Photo Strip'})).toBeEnabled();
  view.unmount();expect(mocks.stop).toHaveBeenCalled();
 });
 it('reports an unavailable camera frame and allows a fresh session without composing incomplete strips',async()=>{
  await open();
  vi.spyOn(HTMLMediaElement.prototype,'readyState','get').mockReturnValue(0);
  fireEvent.click(screen.getByRole('button',{name:'Start Photo Strip'}));await tick(8000);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not capture a camera frame');
  expect(mocks.compose).not.toHaveBeenCalled();expect(mocks.upload).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Start Photo Strip'})).toBeEnabled();
 });
});
