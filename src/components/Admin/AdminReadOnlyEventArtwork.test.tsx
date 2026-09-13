import {render,screen,fireEvent} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({media:vi.fn()}));
vi.mock('@/hooks/useAdminPreviewMedia',()=>({useAdminPreviewMedia:mocks.media}));
vi.mock('@/integrations/supabase/client',()=>({supabase:new Proxy({},{get(){throw Error('Customer storage workflow forbidden');}})}));
import {AdminReadOnlyEventArtwork} from './AdminReadOnlyEventArtwork';
const event={id:'event',user_id:'owner',event_image_path:'actual-owned-event-path',event_image_fit:'cover',event_image_position_x:23,event_image_position_y:80,event_image_zoom:150};
const props={ownerId:'owner',eventId:'event',savedEvent:event};
beforeEach(()=>mocks.media.mockReset().mockReturnValue({url:'https://verified.test/signed.png',error:false,loading:false}));
describe('actual saved event artwork without customer session/storage',()=>{
 it('uses the existing image frame and exact crop geometry with a verified URL',()=>{const {container}=render(<AdminReadOnlyEventArtwork {...props}/>);const img=screen.getByRole('img');expect(img).toHaveAttribute('src','https://verified.test/signed.png');expect(img).toHaveStyle({objectFit:'cover',objectPosition:'23% 80%',transform:'scale(1.5) translate(9%, -9.999999999999998%)'});expect(mocks.media).toHaveBeenCalledWith('owner','event','event_image','event',true,'actual-owned-event-path');expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(container.innerHTML).not.toContain('actual-owned-event-path');});
 it.each([{user_id:'foreign'},{id:'other'},{event_image_zoom:null},{event_image_position_x:101},{event_image_fit:undefined}])('does not infer incomplete or foreign artwork/crop %j',patch=>{render(<AdminReadOnlyEventArtwork {...props} savedEvent={{...event,...patch}}/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(mocks.media.mock.calls.every(call=>!call[4])).toBe(true);});
 it('does not invent artwork for an actual null path',()=>{render(<AdminReadOnlyEventArtwork {...props} savedEvent={{...event,event_image_path:null}}/>);expect(screen.getByText('No saved event photo or logo.')).toBeInTheDocument();expect(screen.queryByRole('img')).not.toBeInTheDocument();});
 it('blocks an incomplete preview while signing is unavailable',()=>{mocks.media.mockReturnValue({url:null,error:true,loading:false});render(<AdminReadOnlyEventArtwork {...props}/>);expect(screen.getByRole('alert')).toHaveTextContent(/awaiting verified/);expect(screen.queryByRole('img')).not.toBeInTheDocument();});
 it('stops displaying a broken verified image',()=>{render(<AdminReadOnlyEventArtwork {...props}/>);fireEvent.error(screen.getByRole('img'));expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent(/No substitute/);});
});
