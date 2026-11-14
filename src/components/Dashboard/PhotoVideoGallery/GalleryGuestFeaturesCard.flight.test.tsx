import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {GalleryGuestFeaturesCard} from './GalleryGuestFeaturesCard';
afterEach(cleanup);
it('blocks overlapping feature saves until the current request settles',async()=>{
 let resolve:any;const pending=new Promise<void>(r=>resolve=r);const toggle=vi.fn(()=>pending);
 render(<MemoryRouter><GalleryGuestFeaturesCard meta={{gallery_id:'g'} as any} onToggleUpload={toggle} onToggleGalleryView={toggle} onTogglePhotoBooth={toggle} onToggleSlideshow={toggle}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('switch',{name:'Photo & Video Sharing'}));
 expect(screen.getAllByRole('switch').every(e=>e.hasAttribute('disabled'))).toBe(true);
 fireEvent.click(screen.getByRole('switch',{name:'Photo & Video Gallery View'}));expect(toggle).toHaveBeenCalledTimes(1);
 await act(async()=>resolve());await waitFor(()=>expect(screen.getByRole('switch',{name:'Photo & Video Gallery View'})).toBeEnabled());
});
