import React from 'react';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {vi} from 'vitest';
import {GuestBrowseGallery} from './GuestBrowseGallery';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),download:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}));
vi.mock('./GuestbookMessageCardPreview',()=>({GuestbookMessageCardPreview:({message,event,firstPageOnly}:any)=><div data-testid="ivory-card" data-thumbnail={!!firstPageOnly}>{event.name} · {event.date} · {message.name} · {message.message}</div>}));
vi.mock('@/lib/guestbookMessagePdf',()=>({downloadGuestbookMessagePdf:mocks.download}));
const message='Thank you for having me at your wedding.';
const photo={id:'photo',kind:'photo',mime_type:'image/jpeg',source_category:'guest_upload',caption:'Photo caption',uploader_name:'Photographer',signed_url:'photo.jpg'};
const text={id:'text',kind:'photo',mime_type:'image/svg+xml',source_category:'guestbook_text',caption:message,uploader_name:'DJ Nader',signed_url:'old-dark.svg'};
function mount(){return render(<React.StrictMode><GuestBrowseGallery token="test" eventName="Hossam & Reema" eventDate="2027-03-19" theme={{isDark:true,textClass:'',mutedClass:''} as any} accent="#ad8b4e"/></React.StrictMode>)}
beforeEach(()=>{mocks.invoke.mockResolvedValue({data:{items:[photo,text]},error:null});mocks.download.mockReset()});
async function open(){mount();await waitFor(()=>expect(screen.getByText('2 memories shared')).toBeInTheDocument());fireEvent.click(screen.getAllByRole('button').find(b=>b.getAttribute('tabindex')==='0')!);return screen.getByRole('dialog')}
it('uses the shared ivory card and actual event metadata in thumbnails and full screen without repeating its caption',async()=>{const dialog=await open();expect(within(dialog).getAllByTestId('ivory-card')).toHaveLength(1);expect(within(dialog).getByTestId('ivory-card')).toHaveTextContent('Hossam & Reema · 2027-03-19 · DJ Nader');expect(within(dialog).queryByText('Shared by DJ Nader')).not.toBeInTheDocument();expect(document.querySelector('img[src="old-dark.svg"]')).toBeNull()});
it('navigates backwards from first to last and forwards back to first',async()=>{const dialog=await open();fireEvent.click(within(dialog).getByRole('button',{name:'Previous',exact:true}));expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();expect(within(dialog).getByText('Photo caption')).toBeInTheDocument();fireEvent.click(within(dialog).getByRole('button',{name:'Next',exact:true}));expect(within(dialog).getByText('1 / 2')).toBeInTheDocument();expect(within(dialog).queryByText('Photo caption')).not.toBeInTheDocument()});
it('supports both keyboard directions',async()=>{const dialog=await open();fireEvent.keyDown(window,{key:'ArrowLeft'});expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();fireEvent.keyDown(window,{key:'ArrowRight'});expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()});
it('downloads the matching keepsake rather than the obsolete poster',async()=>{const dialog=await open();fireEvent.click(within(dialog).getByRole('button',{name:'Download',exact:true}));await waitFor(()=>expect(mocks.download).toHaveBeenCalledWith({name:'DJ Nader',message,at:undefined},{name:'Hossam & Reema',date:'2027-03-19'}))});
