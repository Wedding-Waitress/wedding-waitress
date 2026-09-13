import {act,render,screen} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),preview:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},auth:{getUser:()=>{throw Error('Customer auth forbidden');}},from:()=>{throw Error('Customer queries forbidden');}}}));
vi.mock('@/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview',()=>({PhotoBoothTemplatePreview:(props:any)=>{mocks.preview(props);return <div data-testid="booth-compositor">Actual compositor integration</div>;}}));
import {AdminReadOnlyPhotoBoothDesign} from './AdminReadOnlyPhotoBoothDesign';
const gallery={id:'gallery',user_id:'owner',event_id:'event',show_branding:true,photo_booth_enabled:true,photo_booth_mode:'strip',gallery_title:'#ActualWedding',photo_booth_strip_bottom_text:'Élodie & Jean-Luc',photo_booth_strip_logo_url:null,photo_booth_strip_template_url:null,photo_booth_strip_style:{bgColor:'#123456',nameColor:'#806344',nameFontFamily:'Georgia',nameSize:44,dateSize:28,textBackdrop:'white'}};
const props={ownerId:'owner',eventId:'event',eventName:'Élodie & Jean-Luc O’Connor',eventDate:'2027-09-05',gallery};
describe('saved readonly Photo Booth design',()=>{
 beforeEach(()=>{mocks.invoke.mockReset();mocks.preview.mockClear();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});afterEach(()=>vi.unstubAllEnvs());
 it('uses actual saved style and existing strict compositor without camera or write controls',()=>{
  render(<AdminReadOnlyPhotoBoothDesign {...props}/>);expect(screen.getByTestId('booth-compositor')).toBeInTheDocument();
  expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({kind:'strip',opts:expect.objectContaining({title:props.eventName,bottomText:'Élodie & Jean-Luc',showBranding:true,strictAssets:true,style:expect.objectContaining({bgColor:'#123456',nameSize:44,nameFontFamily:'Georgia'})})}));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
 });
 it('labels an actual null custom style instead of claiming historical custom styling',()=>{
  render(<AdminReadOnlyPhotoBoothDesign {...props} gallery={{...gallery,photo_booth_strip_style:null}}/>);expect(screen.getByText(/No custom strip style is saved/)).toBeInTheDocument();
 });
 it.each([null,{...gallery,user_id:'foreign'},{...gallery,event_id:'other'},{...gallery,show_branding:null},{...gallery,photo_booth_strip_style:{nameSize:-1}}])('does not substitute foreign or incomplete design (%j)',gallery=>{
  render(<AdminReadOnlyPhotoBoothDesign {...props} gallery={gallery}/>);expect(screen.getByText(/No customer design has been substituted/)).toBeInTheDocument();expect(mocks.preview).not.toHaveBeenCalled();
 });
 it('does not substitute a colour background for an unavailable saved library identity',()=>{
  render(<AdminReadOnlyPhotoBoothDesign {...props} gallery={{...gallery,photo_booth_strip_style:{...gallery.photo_booth_strip_style,templateId:'unavailable-fixture-template',backgroundMode:'template'}}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('No substitute background is shown.');expect(mocks.preview).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
 });
 it('verifies both uploaded artwork purposes, and hides the complete design during fresh-access checks',async()=>{
  const root='https://isolated.test/storage/v1/object/public/event-media-branding/owner/event/photobooth-strip-';
  mocks.invoke.mockImplementation(async(_name:string,{body}:any)=>({data:{read_only:true,url:`https://isolated.test/storage/v1/object/sign/event-media-branding/${body.kind}?token=fixture`,expires_at:new Date(Date.now()+60000).toISOString()},error:null}));
  render(<AdminReadOnlyPhotoBoothDesign {...props} gallery={{...gallery,photo_booth_strip_logo_url:root+'logo-123.jpg',photo_booth_strip_template_url:root+'template-123.jpg'}}/>);
  await screen.findByTestId('booth-compositor');expect(mocks.invoke).toHaveBeenCalledTimes(2);
  expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({opts:expect.objectContaining({logoUrl:expect.stringContaining('booth_strip_logo'),templateUrl:expect.stringContaining('booth_strip_template'),strictAssets:true})}));
  mocks.invoke.mockImplementation(()=>new Promise(()=>{}));act(()=>window.dispatchEvent(new Event('focus')));expect(screen.queryByTestId('booth-compositor')).not.toBeInTheDocument();
 });
});
