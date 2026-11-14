import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({update:vi.fn(),moderate:vi.fn(async()=>{}),download:vi.fn(async()=>{}),rows:[
 {id:'approved-text',uploader_name:'Written Approved',message:'Happy memories',moderation_status:'approved',created_at:'2026-11-14T12:00:00Z',guestbook_seq:1},
 {id:'hidden-text',uploader_name:'Written Hidden',message:'Historical hidden note',moderation_status:'hidden',created_at:'2026-11-14T11:00:00Z',guestbook_seq:2},
]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({order:async()=>({data:state.rows,error:null})})}),update:state.update})}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/hooks/useEventMediaGallery',()=>({GALLERY_ALBUMS:['Ceremony','Reception','Other']}));
vi.mock('./galleryFile',()=>({downloadSignedUrl:state.download,filenameFor:(item:any)=>item.id+'.webm'}));
import {GalleryGuestbookMessagesCard} from './GalleryGuestbookMessagesCard';
import {GalleryGrid} from './GalleryGrid';
const recording=(id:string,kind:'audio'|'video',status='approved')=>({id,kind,uploader_name:id,moderation_status:status,source_category:'guestbook_recording',is_guestbook:true,uploaded_at:'2026-11-14T12:00:00Z',signed_url:'https://example.test/'+id+'.webm',storage_path:id+'.webm',duration_sec:30,guestbook_message:id==='Audio Approved'?'Note attached to audio':null,album:'Other'});
const items=[recording('Audio Approved','audio'),recording('Audio Hidden','audio','hidden'),recording('Video Approved','video'),recording('Video Hidden','video','hidden')];
const snapshot=JSON.stringify(items);
function page(){return render(<GalleryGuestbookMessagesCard streamlinedToolbar eventId="fixture-event" eventName="Fixture Wedding" items={items as any} onSetItemModeration={state.moderate} appearance="espresso-glass"/>);}
const noModeration=()=>expect(screen.queryByRole('button',{name:/^(hide|show|approve)$/i})).not.toBeInTheDocument();
beforeEach(()=>{vi.clearAllMocks();for(const name of ['hasPointerCapture','setPointerCapture','releasePointerCapture','scrollIntoView'])Object.defineProperty(HTMLElement.prototype,name,{configurable:true,value:name==='hasPointerCapture'?()=>false:()=>{}});vi.stubGlobal('URL',class extends URL{static createObjectURL(){return 'blob:fixture';}static revokeObjectURL(){}});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();expect(state.update).not.toHaveBeenCalled();expect(JSON.stringify(items)).toBe(snapshot);});
describe('written/audio automatic guestbook management',()=>{
 it('omits written single and bulk moderation/selection while retaining text downloads and historical status',async()=>{page();await screen.findByText('Happy memories');noModeration();expect(screen.queryByRole('button',{name:'Select',exact:true})).toBeNull();expect(screen.queryByRole('checkbox')).toBeNull();expect(screen.getByText('Historical hidden note')).toBeVisible();expect(screen.queryByText('Hidden',{exact:true})).toBeNull();expect(screen.queryByText('Approved',{exact:true})).toBeNull();fireEvent.click(screen.getAllByRole('button',{name:'Download message'})[0]);expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();expect(state.moderate).not.toHaveBeenCalled();});
 it('retains written reading, searching and sort controls without a status filter',async()=>{page();await screen.findByText('Happy memories');expect(screen.getByRole('combobox',{name:'Sort messages'})).toBeEnabled();expect(screen.queryByRole('combobox',{name:'Filter messages by status'})).toBeNull();fireEvent.change(screen.getByRole('textbox',{name:'Search by guest name or message'}),{target:{value:'Historical'}});expect(screen.queryByText('Happy memories')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Read message from Written Hidden'}));expect(within(screen.getByRole('dialog')).getByText('Historical hidden note')).toBeVisible();noModeration();});
 it('retains audio play/download and historical hidden recordings without moderation or unused selection',async()=>{const view=page();await screen.findByText('Happy memories');fireEvent.click(screen.getByRole('button',{name:'Audio Messages (2)'}));noModeration();expect(screen.queryByText('Hidden',{exact:true})).toBeNull();expect(screen.queryByText('Approved',{exact:true})).toBeNull();expect(screen.queryByRole('button',{name:'Select',exact:true})).toBeNull();expect(view.container.querySelectorAll('audio[controls]')).toHaveLength(2);expect(view.container.querySelector('audio')?.className).toContain('guestbookNativeAudio');fireEvent.click(screen.getAllByRole('button',{name:'Download recording'})[0]);await waitFor(()=>expect(state.download).toHaveBeenCalledOnce());fireEvent.click(screen.getByRole('button',{name:'Play recording from Audio Approved'}));expect(screen.getByRole('dialog')).toBeVisible();expect(screen.getByRole('dialog').querySelector('audio[controls]')).not.toBeNull();expect(screen.getByRole('dialog').querySelector('audio')?.className).toContain('guestbookNativeAudio');expect(state.moderate).not.toHaveBeenCalled();});
 it('keeps the existing video controls and clears their selection when returning to written/audio',async()=>{page();await screen.findByText('Happy memories');fireEvent.click(screen.getByRole('button',{name:'Video Messages (2)'}));expect(screen.queryByText('Approved',{exact:true})).toBeNull();expect(screen.getByText('Hidden',{exact:true})).toBeVisible();expect(screen.getAllByRole('button',{name:'Download recording'})).toHaveLength(2);expect(screen.getByRole('button',{name:'Play recording from Video Hidden'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Select',exact:true}));expect(screen.getByText('Select all (2)')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Audio Messages (2)'}));expect(screen.queryByRole('checkbox')).toBeNull();expect(screen.queryByRole('button',{name:/^(Select|Cancel)$/})).toBeNull();noModeration();expect(state.moderate).not.toHaveBeenCalled();});
 it.each(['photo','video'])('retains ordinary %s hide/show actions and exact moderation callbacks',async kind=>{const onSetModeration=vi.fn(async()=>{});const media={...recording('ordinary-'+kind,kind as 'video'),kind,source_category:'guest_upload',is_guestbook:false};const props={hideApprovedBadges:true,onDelete:vi.fn(async()=>{}),onSetModeration,onSetAlbum:vi.fn(async()=>{}),onBulkSetAlbum:vi.fn(async()=>0)};const view=render(<GalleryGrid items={[media] as any} {...props}/>);expect(view.container.querySelectorAll('.absolute.top-1.left-1 span')).toHaveLength(0);fireEvent.click(screen.getByTitle('Hide from guests'));await waitFor(()=>expect(onSetModeration).toHaveBeenCalledWith(media.id,'hidden'));view.rerender(<GalleryGrid items={[{...media,moderation_status:'hidden'}] as any} {...props}/>);expect([...view.container.querySelectorAll('.absolute.top-1.left-1 span')].map(e=>e.textContent)).toEqual(['Hidden']);fireEvent.click(screen.getByTitle('Approve / show again'));await waitFor(()=>expect(onSetModeration).toHaveBeenLastCalledWith(media.id,'approved'));});
});

it('removes only sharing-manager Approved/Hidden shortcuts and cannot retain a stale hidden-only view',()=>{const approved={...recording('Visible Photo','video'),kind:'photo',source_category:'guest_upload',is_guestbook:false};const hidden={...recording('Historical Video','video','hidden'),source_category:'guest_upload',is_guestbook:false};const props={items:[approved,hidden] as any,onDelete:vi.fn(),onSetModeration:vi.fn(async()=>{}),onSetAlbum:vi.fn(async()=>{}),onBulkSetAlbum:vi.fn(async()=>0)};const view=render(<GalleryGrid {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Hidden (1)',exact:true}));expect(screen.queryByRole('button',{name:'Open upload from Visible Photo'})).toBeNull();view.rerender(<GalleryGrid {...props} hideStatusShortcuts hideApprovedBadges/>);expect(screen.getByRole('button',{name:'All Statuses (2)',exact:true})).toBeVisible();expect(screen.queryByRole('button',{name:'Approved (1)',exact:true})).toBeNull();expect(screen.queryByRole('button',{name:'Hidden (1)',exact:true})).toBeNull();expect(screen.getByRole('button',{name:'Open upload from Visible Photo'})).toBeVisible();expect(screen.getByRole('button',{name:'Open upload from Historical Video'})).toBeVisible();expect(screen.getByRole('textbox',{name:'Search uploader, caption or message'})).toBeEnabled();expect(screen.getByRole('combobox',{name:'Filter by media type'})).toBeEnabled();expect(screen.getByRole('button',{name:'Select',exact:true})).toBeEnabled();expect(props.onSetModeration).not.toHaveBeenCalled();});
it('places the remaining actions after sorting and cannot retain a historical guestbook status filter',async()=>{
 const props={eventId:'fixture-event',eventName:'Fixture Wedding',items:items as any,onSetItemModeration:state.moderate,appearance:'espresso-glass' as const};
 const view=render(<GalleryGuestbookMessagesCard {...props}/>);await screen.findByText('Happy memories');
 fireEvent.keyDown(screen.getByRole('combobox',{name:'Filter messages by status'}),{key:'ArrowDown'});
 fireEvent.click(await screen.findByRole('option',{name:'Hidden',exact:true}));
 await waitFor(()=>expect(screen.queryByText('Happy memories')).toBeNull());
 view.rerender(<GalleryGuestbookMessagesCard {...props} streamlinedToolbar/>);
 expect(screen.getByText('Happy memories')).toBeVisible();expect(screen.getByText('Historical hidden note')).toBeVisible();
 expect(screen.queryByRole('combobox',{name:'Filter messages by status'})).toBeNull();
 const actions=screen.getByRole('button',{name:'Refresh'}).closest('[data-guestbook-toolbar="actions"]')!;
 expect(actions.parentElement).toHaveAttribute('data-guestbook-toolbar','filters');
 expect(within(actions as HTMLElement).getAllByRole('button').map(b=>b.textContent?.trim())).toEqual(['Refresh','Export CSV']);
 expect(screen.getByRole('combobox',{name:'Sort messages'}).compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(state.moderate).not.toHaveBeenCalled();
});it('shows complete short and long written text without square previews, while preserving recording previews',async()=>{
 const long='A long guest message with several happy memories, thoughtful wishes, and stories from the day. '.repeat(18)+'Final words remain visible.';
 state.rows.push({id:'long-note',uploader_name:'Long Note',message:long,moderation_status:'approved',created_at:'2026-11-14T10:00:00Z',guestbook_seq:3});
 try {
  const view=page();const short=await screen.findByRole('button',{name:'Read message from Written Approved'});
  const lengthy=screen.getByRole('button',{name:'Read message from Long Note'});
  expect(short).not.toHaveClass('aspect-square');expect(lengthy).toHaveTextContent(long);
  expect(lengthy.querySelector('span')).not.toHaveClass('line-clamp-6');
  expect(view.container.querySelector('[data-guestbook-written-grid="compact"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Audio Messages (2)'}));
  expect(screen.getByRole('button',{name:'Play recording from Audio Approved'})).toHaveClass('aspect-square');
  fireEvent.click(screen.getByRole('button',{name:'Video Messages (2)'}));
  expect(screen.getByRole('button',{name:'Play recording from Video Approved'})).toHaveClass('aspect-square');
 } finally {state.rows.pop();}
});

