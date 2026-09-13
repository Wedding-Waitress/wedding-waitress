import {render,screen,fireEvent} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
import {AdminReadOnlyGallery} from './AdminReadOnlyGallery';
const gallery={id:'gallery',event_id:'event',user_id:'customer'};
const item={id:'photo',user_id:'customer',event_id:'event',gallery_id:'gallery',kind:'photo',mime_type:'image/jpeg',byte_size:123,duration_sec:null,storage_path:'event/photo.jpg',uploader_name:'Actual guest',caption:'Actual saved caption',
 guestbook_message:null,uploaded_at:'2026-09-12T08:00:00Z',moderation_status:'approved',album:'Ceremony',source_category:'guest_upload',is_guestbook:false,is_photo_booth:false,is_photo_booth_strip:false,shared_to_gallery:false};
const props={ownerId:'customer',eventId:'event',eventName:'Actual wedding',gallery,items:[item]};
beforeEach(()=>{mocks.invoke.mockReset().mockImplementation(()=>new Promise(()=>{}));});
it.each([{user_id:'foreign'},{event_id:'other'},{gallery_id:'other'}])('rejects foreign media business records before rendering or signing %j',patch=>{render(<AdminReadOnlyGallery {...props} items={[{...item,...patch}]}/>);expect(screen.getByRole('alert')).toHaveTextContent(/Complete saved gallery classification/);expect(screen.queryByText('Actual saved caption')).not.toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();});
it.each([null,undefined,{}, {...gallery,user_id:'other'}])('never creates or substitutes a missing or foreign gallery (%j)',gallery=>{
 render(<AdminReadOnlyGallery {...props} gallery={gallery}/>);expect(screen.getByText(/A customer gallery has not been created or substituted/)).toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
});
it('uses the shared gallery while removing all mutation controls and keeping private recordings separate',()=>{
 render(<AdminReadOnlyGallery {...props} items={[item,{...item,id:'private',kind:'audio',uploader_name:'Private guest',is_guestbook:true,source_category:'guestbook_recording'}]}/>);
 expect(screen.getByText(/Saved media records: 1/)).toBeInTheDocument();expect(screen.getAllByText('Actual guest').length).toBeGreaterThan(0);
 expect(screen.queryByText('Private guest')).toBeNull();expect(screen.queryByRole('button',{name:/^Select$/})).toBeNull();
 expect(screen.queryByTitle('Delete')).toBeNull();expect(screen.queryByTitle('Hide from guests')).toBeNull();
 expect(mocks.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Load verified media for this page'}));
 expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',expect.objectContaining({body:expect.objectContaining({kind:'event_media',customer_id:'customer',event_id:'event',record_id:'photo'})}));
});
it('does not request more than one bounded record page and clears verification when paging',()=>{
 const items=Array.from({length:25},(_,i)=>({...item,id:`photo-${i}`,storage_path:`event/photo-${i}.jpg`}));
 render(<AdminReadOnlyGallery {...props} items={items}/>);
 fireEvent.click(screen.getByRole('button',{name:'Load verified media for this page'}));expect(mocks.invoke).toHaveBeenCalledTimes(24);
 fireEvent.click(screen.getByRole('button',{name:'Next media page'}));expect(mocks.invoke).toHaveBeenCalledTimes(24);
 fireEvent.click(screen.getByRole('button',{name:'Load verified media for this page'}));expect(mocks.invoke).toHaveBeenCalledTimes(25);
});
