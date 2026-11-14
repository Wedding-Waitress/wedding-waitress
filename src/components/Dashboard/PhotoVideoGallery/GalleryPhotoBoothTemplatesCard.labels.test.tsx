import React from 'react';import{cleanup,render,screen}from'@testing-library/react';import{afterEach,expect,it,vi}from'vitest';
import{GalleryPhotoBoothTemplatesCard}from'./GalleryPhotoBoothTemplatesCard';
vi.mock('./PhotoBoothTemplatePreview',()=>({PhotoBoothTemplatePreview:()=>null}));
vi.mock('./PhotoBoothTemplateLibraryDialog',()=>({PhotoBoothTemplateLibraryDialog:()=>null}));
afterEach(cleanup);
it('names the footer, font selectors and all three colour controls distinctly',()=>{
 render(<GalleryPhotoBoothTemplatesCard eventId="event" eventName="Review" meta={{gallery_id:'gallery',photo_booth_strip_style:null}as any} onSave={vi.fn()}/>);
 expect(screen.getByRole('textbox',{name:'Custom Footer Text'})).toBeVisible();
 for(const name of ['Footer Header Font family','Footer Header Font size','Footer Date Font family','Footer Date Font size'])expect(screen.getByRole('combobox',{name})).toBeVisible();
 for(const name of ['Background Colour','Footer Header Font colour','Footer Date Font colour'])expect(screen.getByRole('button',{name})).toBeVisible();
});
