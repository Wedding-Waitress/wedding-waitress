import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({toast:vi.fn(),remove:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/hooks/useLiveViewVisibility',()=>({useLiveViewVisibility:()=>({settings:{show_rsvp_invite:true},updateVisibility:vi.fn(),isLoading:false,isSaving:false})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({remove:mocks.remove})}}}));
import {LiveSlideshowConfig} from './LiveSlideshowConfig';
describe('Slideshow media removal',()=>{
 it('preserves RSVP protection settings and does not announce success or delete the file on failed save',async()=>{
  const update=vi.fn().mockResolvedValue(false);
  render(<LiveSlideshowConfig eventId="event" moduleState={{settings:{event_id:'event',rsvp_invite_config:{file_url:'https://example.com/invite.png',file_name:'Invite',rsvp_override_auto_lock:true}},loading:false,saving:false,updateModuleConfig:update} as any}/>);
  fireEvent.click(screen.getByText('Configure RSVP Invite Settings'));
  fireEvent.click(await screen.findByRole('button',{name:/^Remove$/}));
  await waitFor(()=>expect(update).toHaveBeenCalledWith('rsvp_invite_config',{rsvp_override_auto_lock:true}));
  expect(mocks.remove).not.toHaveBeenCalled();expect(mocks.toast).not.toHaveBeenCalledWith({title:'Removed'});
 });
});
