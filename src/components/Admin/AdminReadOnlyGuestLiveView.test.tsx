import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({media:vi.fn()}));
vi.mock('@/hooks/useAdminPreviewMedia',()=>({useAdminPreviewMedia:mocks.media}));
vi.mock('@/hooks/useLiveViewModuleSettings',()=>({useLiveViewModuleSettings:()=>{throw Error('Customer settings upsert forbidden');}}));
vi.mock('@/hooks/useLiveViewVisibility',()=>({useLiveViewVisibility:()=>{throw Error('Customer visibility upsert forbidden');}}));
import {AdminReadOnlyGuestLiveView} from './AdminReadOnlyGuestLiveView';
const visibility={id:'visibility',user_id:'owner',event_id:'event',show_search:true,show_menu:false,kiosk_show_dietary:true};
const configuration={id:'settings',user_id:'owner',event_id:'event',menu_config:{source:'upload',file_url:'https://private.test/original.png',file_name:'Menu.png',file_type:'image/png',primary_token:'NEVER-EXPOSE'},welcome_video_config:{video_url:'https://private.test/video.mp4',file_type:'video/mp4'}};
beforeEach(()=>{mocks.media.mockReset();mocks.media.mockReturnValue({url:null,error:false,loading:false});});
describe('saved guest lookup slideshow read-only configuration',()=>{
 it.each(['', '   '])('retains the customer legacy Welcome Video upload when canonical URL is empty %j',video_url=>{
  render(<AdminReadOnlyGuestLiveView ownerId="owner" eventId="event" visibility={visibility} configuration={{...configuration,menu_config:{},welcome_video_config:{video_url,file_url:'https://private.test/legacy.mp4',file_type:'video/mp4'}}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load verified read-only asset'}));
  expect(mocks.media).toHaveBeenLastCalledWith('owner','event','live_view_welcome','settings',true,expect.any(String));
  expect(document.body.innerHTML).not.toContain('https://private.test');
 });
 it('shows saved flags without manufacturing absent visibility or importing customer hooks',()=>{
  render(<AdminReadOnlyGuestLiveView ownerId="owner" eventId="event" visibility={visibility} configuration={configuration}/>);
  expect(screen.getByRole('switch',{name:'Guest Search'})).toBeChecked();expect(screen.getByRole('switch',{name:'Show Menu'})).not.toBeChecked();
  for(const control of screen.getAllByRole('switch'))expect(control).toBeDisabled();
  expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(document.body.innerHTML).not.toContain('NEVER-EXPOSE');expect(document.body.innerHTML).not.toContain('https://private.test');
  expect(mocks.media.mock.calls.every(call=>call[4]===false)).toBe(true);
 });
 it.each([{user_id:'foreign'}, {event_id:'other'}, {id:null}])('rejects unverified row identity %j',patch=>{
  render(<AdminReadOnlyGuestLiveView ownerId="owner" eventId="event" visibility={{...visibility,...patch}} configuration={{...configuration,...patch}}/>);
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.getByText(/No default visibility has been substituted/)).toBeInTheDocument();expect(mocks.media).not.toHaveBeenCalled();
 });
 it('uses only a verified asset URL after explicit local load and stops on asset failure',()=>{
  mocks.media.mockImplementation((_owner,_event,_kind,_id,enabled)=>({url:enabled?'https://verified.test/menu.png':null,error:false,loading:false}));
  render(<AdminReadOnlyGuestLiveView ownerId="owner" eventId="event" visibility={visibility} configuration={{...configuration,welcome_video_config:{}}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load verified read-only asset'}));
  expect(mocks.media).toHaveBeenLastCalledWith('owner','event','live_view_menu','settings',true,expect.any(String));
  const img=screen.getByRole('img');expect(img).toHaveAttribute('src','https://verified.test/menu.png');fireEvent.error(img);
  expect(screen.getByRole('alert')).toHaveTextContent(/No substitute/);expect(screen.queryByRole('img')).not.toBeInTheDocument();
 });
 it('does not guess a video renderer or expose customer links for a saved PDF',()=>{
  mocks.media.mockReturnValue({url:'https://verified.test/saved.pdf',error:false,loading:false});
  render(<AdminReadOnlyGuestLiveView ownerId="owner" eventId="event" visibility={visibility} configuration={{...configuration,welcome_video_config:{},menu_config:{...configuration.menu_config,file_type:'application/pdf'}}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load verified read-only asset'}));expect(screen.getByText(/document inspection remains pending/)).toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(document.querySelector('iframe,video,img')).toBeNull();
 });
});
