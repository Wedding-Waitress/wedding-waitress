import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
const mock=vi.hoisted(()=>({invoke:vi.fn(),open:vi.fn(),cancel:vi.fn(),uploads:vi.fn(),fail:true,personal:false}));
vi.mock('@/integrations/supabase/client',()=>({SUPABASE_URL:'https://example.test',SUPABASE_PUBLISHABLE_KEY:'test',supabase:{functions:{invoke:mock.invoke}}}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{resolvedLanguage:'en'}})}));
vi.mock('@/lib/videoWishesRecorder',()=>({VIDEO_WISHES_MIMES:['video/mp4'],VideoWishesRecorder:class{constructor(private c:any){}open(){mock.open();this.c.preview({});}start(){this.c.recorded(new Blob(['video'],{type:'video/mp4'}));}cancel(){mock.cancel();}stop(){}}}));
vi.mock('tus-js-client',()=>({Upload:class{constructor(_blob:any,private options:any){mock.uploads();}findPreviousUploads(){return Promise.resolve([]);}start(){this.options.onProgress(5,5);this.options.onSuccess();}abort(){return Promise.resolve();}}}));
import GuestVideoWishes from './GuestVideoWishes';
beforeEach(()=>{vi.clearAllMocks();mock.fail=true;mock.personal=false;URL.createObjectURL=vi.fn(()=> 'blob:preview');URL.revokeObjectURL=vi.fn();mock.invoke.mockImplementation(async(_name,{body})=>{
 if(body.action==='context')return {data:{event:{id:'event',name:'Test Event',date:'2027-01-01'},maxBytes:104857600,maxSeconds:120,mainGuestId:mock.personal?'main':null,hasFamily:mock.personal,members:mock.personal?[{id:'main',name:'Main Guest'},{id:'member',name:'Family Guest'}]:[]}};
 if(body.action==='reserve')return {data:{id:'item',path:'event/item.mp4',status:'pending'}};
 if(body.action==='verify')return mock.fail?{error:{context:{json:async()=>({error:'PROCESSOR_UNAVAILABLE'})}}}:{data:{status:'uploaded'}};
});});
afterEach(cleanup);
const mount=(state:any={})=>render(<MemoryRouter initialEntries={[{pathname:'/s/test/video-wishes',state}]}><Routes><Route path="/s/:eventSlug/video-wishes" element={<GuestVideoWishes/>}/><Route path="/s/:eventSlug" element={<div>Invitation destination</div>}/></Routes></MemoryRouter>);
it('keeps the selected video and reuses its stored upload on verification retry',async()=>{
 mount();fireEvent.change(await screen.findByRole('textbox'),{target:{value:'Synthetic Test'}});
 expect(mock.open).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Record Video'}));
 fireEvent.click(await screen.findByRole('button',{name:'Start Recording'}));
 fireEvent.click(await screen.findByRole('button',{name:'Send Video Wishes'}));
 await screen.findByRole('alert');expect(document.querySelector('video')?.getAttribute('src')).toBe('blob:preview');expect(mock.uploads).toHaveBeenCalledTimes(1);
 mock.fail=false;fireEvent.click(screen.getByRole('button',{name:'Send Video Wishes'}));
 await screen.findByText('Your video wishes have been sent!');expect(mock.uploads).toHaveBeenCalledTimes(1);
 const reservations=mock.invoke.mock.calls.filter(([,options])=>options.body.action==='reserve');expect(reservations[0][1].body.requestId).toBe(reservations[1][1].body.requestId);
});
it('defaults to the invitation guest, allows a family selection, and returns to the invitation',async()=>{
 mock.personal=true;mount({videoWishesInvite:'secure-context'});const select=await screen.findByRole('combobox');expect((select as HTMLSelectElement).value).toBe('main');expect(screen.queryByRole('textbox')).toBeNull();
 fireEvent.change(select,{target:{value:'member'}});expect((select as HTMLSelectElement).value).toBe('member');expect(screen.getByRole('option',{name:'Our family'})).toBeTruthy();
 expect(mock.invoke.mock.calls[0][1].body.invite).toBe('secure-context');fireEvent.click(screen.getByRole('button',{name:'Back to Invitation'}));await screen.findByText('Invitation destination');
});
