import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({from:vi.fn(()=>{throw new Error('Customer data queries forbidden');}),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from,functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
import {AdminReadOnlyGuestbook} from './AdminReadOnlyGuestbook';
const gallery={id:'gallery',user_id:'customer',event_id:'event'};
const message={id:'message',event_id:'event',gallery_id:'gallery',uploader_name:'Actual writer',message:'Élodie & José — saved personal message.',created_at:'2026-09-12T08:00:00Z',moderation_status:'hidden',guestbook_seq:1};
const recording={id:'recording',kind:'audio',mime_type:'audio/webm',byte_size:123,duration_sec:3,storage_path:'event/recording.webm',uploader_name:'Actual speaker',caption:null,
 guestbook_message:'Saved recording note',uploaded_at:'2026-09-12T08:00:00Z',moderation_status:'approved',album:null,source_category:'guestbook_recording',is_guestbook:true,is_photo_booth:false,is_photo_booth_strip:false,shared_to_gallery:false};
const props={ownerId:'customer',eventId:'event',eventName:'Actual wedding',gallery,items:[recording],savedMessages:[message]};
beforeEach(()=>{mocks.from.mockClear();mocks.invoke.mockReset().mockImplementation(()=>new Promise(()=>{}));vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});
afterEach(()=>{vi.unstubAllEnvs();});
it.each([null,undefined,{}, {...gallery,user_id:'other'}])('does not create or substitute missing or foreign Guestbooks (%j)',gallery=>{
 render(<AdminReadOnlyGuestbook {...props} gallery={gallery}/>);expect(screen.getByText(/A customer Guestbook has not been created or substituted/)).toBeInTheDocument();expect(mocks.from).not.toHaveBeenCalled();
});
it('uses the actual organizer card and saved hidden message/note without queries, auto-sharing or moderation controls',async()=>{
 render(<AdminReadOnlyGuestbook {...props}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Read message from Actual writer'})).toBeInTheDocument());
 expect(screen.getByRole('button',{name:/^Select$/})).toBeDisabled();expect(screen.queryByRole('button',{name:/^Hide$|^Show$/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Read message from Actual writer'}));
 expect(screen.getByRole('dialog')).toHaveTextContent(message.message);
 expect(mocks.from).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
});
it('verifies a private recording only when opened and removes playback during revalidation',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{read_only:true,url:'https://isolated.test/storage/v1/object/sign/event-media/event/recording.webm?token=fixture',expires_at:new Date(Date.now()+600000).toISOString()},error:null});
 render(<AdminReadOnlyGuestbook {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:/Audio Messages/}));
 expect(mocks.invoke).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Add to Gallery'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Play recording from Actual speaker'}));
 await waitFor(()=>expect(document.querySelector('audio')).not.toBeNull());
 expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',expect.objectContaining({body:expect.objectContaining({kind:'event_media',record_id:'recording',customer_id:'customer',event_id:'event'})}));
 mocks.invoke.mockImplementation(()=>new Promise(()=>{}));fireEvent(window,new Event('focus'));
 expect(document.querySelector('audio')).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
});
it('refuses unknown message ownership and incomplete source rows',()=>{
 render(<AdminReadOnlyGuestbook {...props} savedMessages={[{...message,gallery_id:'other'}]}/>);
 expect(screen.getByRole('alert')).toHaveTextContent('Complete saved Guestbook');expect(mocks.from).not.toHaveBeenCalled();
});
