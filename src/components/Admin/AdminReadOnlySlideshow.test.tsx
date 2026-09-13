import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({change:vi.fn(),save:vi.fn()}));
vi.mock('@/components/Dashboard/PhotoVideoGallery/GallerySlideshowAccessCard',()=>({GallerySlideshowAccessCard:()=>{throw Error('Private customer access card mounted');}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:new Proxy({},{get(){throw Error('Customer query forbidden');}})}));
import {AdminReadOnlySlideshow} from './AdminReadOnlySlideshow';
import {GallerySlideshowSettingsCard} from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowSettingsCard';
import {slideshowSettingsFromRow} from '@/lib/slideshowSettings';
const gallery={id:'gallery',user_id:'owner',event_id:'event',slideshow_enabled:true,slideshow_include_photos:true,slideshow_include_videos:false,slideshow_albums:['Ceremony'],slideshow_order:'oldest',slideshow_slide_duration_sec:8,slideshow_transition:'slide',slideshow_show_caption:false,slideshow_loop:true,primary_token:'MUST-NOT-EXPOSE'};
describe('actual read-only slideshow settings',()=>{
 it('shows actual saved playback controls and never mounts private access',()=>{
  render(<AdminReadOnlySlideshow ownerId="owner" eventId="event" gallery={gallery}/>);
  expect(screen.getByText('Oldest First')).toBeInTheDocument();expect(screen.getByText('8 seconds')).toBeInTheDocument();
  expect(screen.getByRole('switch',{name:'Include Photos'})).toBeChecked();expect(screen.getByRole('switch',{name:'Include Videos'})).not.toBeChecked();
  for(const control of [...screen.getAllByRole('switch'),...screen.getAllByRole('combobox'),...screen.getAllByRole('button')])expect(control).toBeDisabled();
  expect(screen.queryByDisplayValue('MUST-NOT-EXPOSE')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it('guards change/save callbacks even when callers supply unsaved local values',()=>{
  mocks.change.mockClear();mocks.save.mockClear();
  render(<GallerySlideshowSettingsCard meta={gallery as any} value={{...slideshowSettingsFromRow(gallery),order:'shuffle'}} onChange={mocks.change} onSave={mocks.save} readOnly/>);
  fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));fireEvent.click(screen.getByRole('button',{name:'All Albums'}));
  fireEvent.click(screen.getByRole('switch',{name:'Include Photos'}));expect(mocks.change).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.queryByRole('button',{name:'Discard changes'})).not.toBeInTheDocument();
 });
 it.each([null,{...gallery,user_id:'foreign'},{...gallery,event_id:'other'},{...gallery,slideshow_loop:null},{...gallery,slideshow_slide_duration_sec:7},{...gallery,slideshow_include_photos:false}])('does not manufacture missing or unsafe saved settings (%j)',gallery=>{
  render(<AdminReadOnlySlideshow ownerId="owner" eventId="event" gallery={gallery}/>);expect(screen.getByText(/No default configuration or private access link has been substituted/)).toBeInTheDocument();expect(screen.queryByRole('switch')).not.toBeInTheDocument();
 });
});
