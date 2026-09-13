import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {AdminReadOnlyPlaceCards} from './AdminReadOnlyPlaceCards';
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
const media=vi.hoisted(()=>({url:null as string|null,error:false,loading:false}));
vi.mock('@/hooks/useAdminPreviewMedia',()=>({useAdminPreviewMedia:()=>media}));
const ownerId='owner',eventId='event';
const savedSettings={user_id:ownerId,event_id:eventId,font_family:'Inter',font_color:'#000000',background_color:'#ffffff',
 background_image_url:null,background_image_type:'none',front_image_url:null,back_image_url:null,mass_message:'Thank you for celebrating with us.',
 guest_font_family:'Great Vibes',info_font_family:'Alex Brush',info_font_color:'#000000',guest_name_bold:false,guest_name_italic:false,
 guest_name_underline:false,background_behind_names:false,background_behind_table_seats:false,info_bold:false,info_italic:false,info_underline:false,
 background_image_x_position:50,background_image_y_position:50,background_image_scale:100,background_image_opacity:100,
 guest_name_font_size:30,info_font_size:16,name_spacing:4,guest_name_offset_x:0,guest_name_offset_y:0,table_offset_x:0,table_offset_y:0,
 seat_offset_x:0,seat_offset_y:0,guest_name_rotation:0,table_seat_rotation:0,individual_messages:{guest:'Saved individual message'},
 photo_video_qr_enabled:false,photo_video_qr_x:50,photo_video_qr_y:50,photo_video_qr_size:22};
const guest={id:'guest',user_id:ownerId,event_id:eventId,first_name:'Élodie',last_name:'O’Connor',assigned:true,table_id:'table',table_no:2,seat_no:3};
const props={ownerId,eventId,savedSettings,guests:[guest],tables:[{id:'table',user_id:ownerId,event_id:eventId,name:'Family table',table_no:2}],event:{name:'Saved wedding',date:'2027-09-05',venue:'Saved venue'}};
beforeEach(()=>{media.url=null;media.error=false;vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:700,height:32,x:0,y:0,top:0,left:0,right:700,bottom:32,toJSON:()=>({})});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each([null,undefined,{}, {...savedSettings,user_id:'other'}])('never substitutes missing or foreign customer settings (%j)',savedSettings=>{
 render(<AdminReadOnlyPlaceCards {...props} savedSettings={savedSettings}/>);
 expect(screen.getByText(/A default customer document has not been substituted/)).toBeInTheDocument();
 expect(document.querySelector('[data-print-mirror-document="name-place-cards"]')).toBeNull();
});
it('renders actual assigned guests with the existing authoritative A4 renderer',()=>{
 render(<AdminReadOnlyPlaceCards {...props} guests={[guest,{...guest,id:'unassigned',first_name:'Not included',assigned:false}]}/>);
 fireEvent.change(screen.getByRole('combobox',{name:'Table'}),{target:{value:'table'}});
 const page=document.querySelector('[data-print-mirror-document="name-place-cards"]') as HTMLElement;
 expect(page).not.toBeNull();expect(page.style.width).toBe('210mm');expect(page.style.height).toBe('297mm');
 expect(page.textContent).toContain('Élodie');expect(page.textContent).toContain('O’Connor');
 expect(page.textContent).toContain('Saved individual message');expect(page.textContent).not.toContain('Not included');
 expect(screen.queryByRole('button',{name:/Save/})).toBeNull();
});
it.each([{...savedSettings,photo_video_qr_enabled:null},{...savedSettings,photo_video_qr_enabled:true},
 {...savedSettings,background_image_url:'/lovable-uploads/artwork.png',background_image_type:'full'}])('refuses incomplete QR or crop history (%j)',savedSettings=>{
 render(<AdminReadOnlyPlaceCards {...props} savedSettings={savedSettings}/>);
 expect(screen.getByRole('alert')).toBeInTheDocument();
 expect(document.querySelector('[data-print-mirror-document="name-place-cards"]')).toBeNull();
});
it('rejects malformed source data rather than coercing it',()=>{
 render(<AdminReadOnlyPlaceCards {...props} guests={[{...guest,assigned:'false'}]}/>);
 expect(screen.getByRole('alert')).toHaveTextContent('Complete saved Place Card content');
});
it('preserves the actual customer output when unused legacy front/back columns are recorded',()=>{
 const view=render(<AdminReadOnlyPlaceCards {...props}/>);fireEvent.change(screen.getByRole('combobox',{name:'Table'}),{target:{value:'table'}});
 const original=document.querySelector('[data-print-mirror-document="name-place-cards"]')!.innerHTML;
 view.rerender(<AdminReadOnlyPlaceCards {...props} savedSettings={{...savedSettings,front_image_url:'https://unverified.test/legacy-front.png',back_image_url:'https://unverified.test/legacy-back.png'}}/>);
 expect(document.querySelector('[data-print-mirror-document="name-place-cards"]')!.innerHTML).toBe(original);
 expect(screen.getByText(/unused by the current customer renderer/)).toBeInTheDocument();
 expect([...document.querySelectorAll('img')].some(image=>image.src.includes('legacy-'))).toBe(false);
});
it.each(['cover','contain'] as const)('renders only verified signed artwork with the exact recorded %s crop',async fit=>{
 media.url='https://isolated.test/storage/v1/object/sign/qr-assets/verified.png?token=fixture';
 vi.stubGlobal('Image',class {onload:(()=>void)|null=null;onerror:(()=>void)|null=null;crossOrigin='';set src(_value:string){queueMicrotask(()=>this.onload?.());}});
 const settings={...savedSettings,id:'settings',background_image_url:'https://isolated.test/storage/v1/object/public/qr-assets/owner/place-cards/place-card-bg-123.png',background_image_type:'full'};
 const savedFit={user_id:ownerId,event_id:eventId,revision:1,snapshot:{settings_id:'settings',image_url:settings.background_image_url,image_type:'full',x:50,y:50,fit}};
 render(<AdminReadOnlyPlaceCards {...props} savedSettings={settings} savedFit={savedFit}/>);
 await screen.findByRole('combobox',{name:'Table'});fireEvent.change(screen.getByRole('combobox',{name:'Table'}),{target:{value:'table'}});
 await waitFor(()=>expect(document.querySelector('[data-print-mirror-document="name-place-cards"]')).not.toBeNull());
 const backgrounds=[...document.querySelectorAll<HTMLElement>('[style]')].filter(node=>node.style.backgroundImage.includes('verified.png'));
 expect(backgrounds.length).toBeGreaterThan(0);expect(backgrounds.every(node=>node.style.backgroundSize===fit)).toBe(true);
 expect(document.querySelector('[data-print-mirror-document="name-place-cards"]')).toHaveStyle({width:'210mm',height:'297mm'});
});
it.each([[{...guest,user_id:'foreign'}],[guest,guest]].map(guests=>({guests})))('blocks foreign or duplicate guest records (%j)',({guests})=>{
 render(<AdminReadOnlyPlaceCards {...props} guests={guests}/>);expect(screen.getByRole('alert')).toHaveTextContent('Complete saved Place Card content');
});
