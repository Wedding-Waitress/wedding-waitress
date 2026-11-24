import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GalleryDownloadsCard} from './GalleryDownloadsCard';
import {GuestbookDownloadAllButton} from './GuestbookDownloadAllButton';
import {PhotoBoothDownloadAllButton} from './PhotoBoothDownloadAllButton';
const z=vi.hoisted(()=>({entries:[] as string[],generate:vi.fn()}));
vi.mock('jszip',()=>({default:class{files:Record<string,unknown>={};file(name:string,blob:Blob){this.files[name]=blob;z.entries.push(name)}generateAsync(){return z.generate()}}}));
vi.mock('@/lib/guestbookMessagePdf',()=>({createGuestbookMessagePdf:vi.fn(async()=>({output:()=>new ArrayBuffer(8)}))}));
const item=(id:string,extra={})=>({id,kind:'photo',mime_type:'image/jpeg',storage_path:`${id}.jpg`,signed_url:`https://example.com/${id}`,moderation_status:'approved',uploader_name:'Guest',source_category:'guest_upload',...extra} as any);
let clicked:ReturnType<typeof vi.spyOn>;
beforeEach(()=>{z.entries=[];z.generate.mockReset().mockResolvedValue(new Blob(['zip']));vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['image'])}));Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:test')});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});clicked=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('bundles every written PDF and audio/video recording, including written-only events and duplicate filenames',async()=>{
 const writtenMessages=[{seq:1,name:'Guest one',message:'Best wishes'},{seq:null,name:'Guest two',message:'Congratulations'},{seq:null,name:'Guest three',message:'Lovely day'}];
 const recordings=[item('audio',{kind:'audio',source_category:'guestbook_recording'}),item('video',{kind:'video',source_category:'guestbook_recording'})];
 const view=render(<GuestbookDownloadAllButton items={recordings} writtenMessages={writtenMessages} eventName="Fixture Wedding" eventDate="2027-03-19"/>);
 fireEvent.click(screen.getByRole('button',{name:'Download All Guestbook Messages'}));
 await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(1));
 expect(z.entries.filter(name=>name.startsWith('guestbook-written/'))).toHaveLength(3);
 expect(new Set(z.entries).size).toBe(5);
 expect(z.entries.some(name=>name.startsWith('guestbook-video/'))).toBe(true);
 expect(z.entries.some(name=>name.startsWith('guestbook-voice/'))).toBe(true);
 expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(recordings.map(i=>i.signed_url));
 z.entries=[];view.rerender(<GuestbookDownloadAllButton items={[]} writtenMessages={writtenMessages} eventName="Fixture Wedding"/>);
 fireEvent.click(screen.getByRole('button',{name:'Download All Guestbook Messages'}));
 await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(2));
 expect(z.entries).toHaveLength(3);
});
it('excludes private recordings from all public ZIP scopes',async()=>{
 render(<GalleryDownloadsCard items={[item('public'),item('private',{source_category:'video_wishes',is_guestbook:true,kind:'video',shared_to_gallery:false})]}/>);
 fireEvent.click(screen.getByRole('button',{name:/Download All/}));await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(1));expect(z.entries).toHaveLength(1);expect(z.entries[0]).not.toContain('private');
});
it('discards an archive if the source selection changes while generating',async()=>{
 let resolve:any;z.generate.mockReturnValue(new Promise(r=>resolve=r));const view=render(<GalleryDownloadsCard items={[item('old')]} eventName="Old"/>);
 fireEvent.click(screen.getByRole('button',{name:/Download All/}));await waitFor(()=>expect(z.generate).toHaveBeenCalledTimes(1));view.rerender(<GalleryDownloadsCard items={[item('new')]} eventName="New"/>);
 await act(async()=>resolve(new Blob(['zip'])));expect(clicked).not.toHaveBeenCalled();
});
it('does not download after the workspace unmounts',async()=>{
 let resolve:any;z.generate.mockReturnValue(new Promise(r=>resolve=r));const view=render(<GalleryDownloadsCard items={[item('old')]}/>);
 fireEvent.click(screen.getByRole('button',{name:/Download All/}));await waitFor(()=>expect(z.generate).toHaveBeenCalledTimes(1));view.unmount();await act(async()=>resolve(new Blob(['zip'])));expect(clicked).not.toHaveBeenCalled();
});

it.each([GuestbookDownloadAllButton,PhotoBoothDownloadAllButton])('discards a stale specialised archive for %s',async(Component)=>{
 let resolve:any;z.generate.mockReturnValue(new Promise(r=>resolve=r));const old=item('old',{source_category:'photo_booth',is_photo_booth:true});
 const view=render(<Component items={[old]} eventName="Old"/>);fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(z.generate).toHaveBeenCalledTimes(1));
 view.rerender(<Component items={[{...old,id:'new'}]} eventName="New"/>);await act(async()=>resolve(new Blob(['zip'])));expect(clicked).not.toHaveBeenCalled();
});
it('keeps grouped public media and guestbook recordings in separate archives with their original sources',async()=>{
 const library=[item('photo'),item('ordinary-video',{kind:'video'}),item('booth-strip',{source_category:'photo_booth',is_photo_booth:true,is_photo_booth_strip:true})];
 const recordings=[item('guestbook-audio',{kind:'audio',source_category:'guestbook_recording',is_guestbook:true}),item('guestbook-video',{kind:'video',source_category:'guestbook_recording',is_guestbook:true})];
 render(<GalleryDownloadsCard items={library} scopes={['all','photos','videos']} additionalDownloadAction={<GuestbookDownloadAllButton items={recordings} label="Download Guestbook Recordings"/>}/>);
 expect(screen.queryByRole('button',{name:/Download Approved Only/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Download All/}));await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(1));
 expect(z.entries).toHaveLength(3);expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(library.map(i=>i.signed_url));
 z.entries=[];vi.mocked(fetch).mockClear();
 fireEvent.click(screen.getByRole('button',{name:'Download Guestbook Recordings',exact:true}));await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(2));
 expect(z.entries).toHaveLength(2);expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(recordings.map(i=>i.signed_url));
});
