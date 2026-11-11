import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {GallerySlideshowPreviewCard} from './GallerySlideshowPreviewCard';
import {DEFAULT_SLIDESHOW_SETTINGS} from '@/lib/slideshowSettings';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('pauses and resumes the actual video rather than only changing its autoplay attribute',()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 render(<GallerySlideshowPreviewCard items={[{id:'v',kind:'video',mime_type:'video/mp4',source_category:'guest_upload',moderation_status:'approved',signed_url:'https://example.com/v.mp4'} as any]} settings={DEFAULT_SLIDESHOW_SETTINGS}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pause'}));expect(pause).toHaveBeenCalled();play.mockClear();
 fireEvent.click(screen.getByRole('button',{name:'Play'}));expect(play).toHaveBeenCalled();
});
