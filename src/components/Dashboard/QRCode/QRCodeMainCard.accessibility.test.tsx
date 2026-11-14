import React from 'react';
import * as qrExports from '@/lib/qrCustomerExports';
import * as pdfExports from '@/lib/pdfExportUtils';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({read:vi.fn(),generate:vi.fn(),toast:vi.fn(),update:vi.fn(),save:vi.fn().mockResolvedValue({cleanupFailed:false})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mock.toast})}));
vi.mock('@/hooks/useLiveViewVisibility',()=>({useLiveViewVisibility:()=>({settings:{show_rsvp_invite:true,show_welcome_video:true,show_floor_plan:true,show_reception_floor_plan:true,show_menu:true},updateVisibility:mock.update})}));
vi.mock('@/hooks/useLiveViewModuleSettings',()=>({useLiveViewModuleSettings:()=>({settings:{floor_plan_config:{source:'upload'},reception_floor_plan_config:{source:'upload'}},updateModuleConfig:mock.update,refreshSettings:mock.update})}));
vi.mock('@/hooks/useWelcomeVideoUpload',()=>({useWelcomeVideoUpload:()=>({uploadVideo:mock.update,deleteVideo:mock.update,isUploading:false,isProcessing:false})}));
vi.mock('@/hooks/useGuestSongRequestSettings',()=>({useGuestSongRequestSettings:()=>({settings:{enabled:true,max_requests_per_guest:3},updateSettings:mock.update})}));
vi.mock('@/hooks/useEventDynamicQR',()=>({useEventDynamicQR:()=>({dynamicUrl:'https://example.test/guest-lookup/example'})}));
vi.mock('@/components/Dashboard/QRCode/VideoWishesConfigCard',()=>({VideoWishesConfigCard:()=>null}));
vi.mock('@/lib/qrDesignPersistence',()=>({createQRSaveQueue:()=>async(task:any)=>task(),persistQRDesign:(...args:any[])=>mock.save(...args)}));
vi.mock('@/lib/advancedQRGenerator',()=>({AdvancedQRGenerator:class {generate(...args:any[]){return mock.generate(...args)}}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:()=>({select:()=>({eq:()=>({maybeSingle:mock.read})})}),
 auth:{getUser:async()=>({data:{user:{id:'isolated-owner'}}})},
}}));
import {QRCodeMainCard} from './QRCodeMainCard';
import {QRCodeSeatingChart} from './QRCodeSeatingChart';
const event={id:'isolated-event',name:'Existing Event',slug:'example'} as any;
beforeEach(()=>{vi.clearAllMocks();mock.read.mockResolvedValue({data:null,error:null});mock.generate.mockResolvedValue('data:image/png;base64,fixture');});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('QR design accessibility',()=>{
 it('opens every empty asset picker from the keyboard without uploading a file',async()=>{
 render(<QRCodeMainCard eventId={event.id} event={event}/>);
 await waitFor(()=>expect(screen.getByRole('group',{name:'QR code design'})).not.toBeDisabled());
 for(const section of ['Configure RSVP Invite Settings','Configure Welcome Video Settings','Configure Ceremony Floor Plan Settings','Configure Reception Floor Plan Settings','Configure Menu Settings','Configure Hero Background']) fireEvent.click(screen.getByRole('button',{name:section}));
 const choose=vi.spyOn(HTMLInputElement.prototype,'click').mockImplementation(()=>{});
 for(const name of ['Upload digital invitation','Upload welcome video','Upload ceremony floor plan image','Upload reception floor plan image','Upload wedding menu','Upload photo or logo']){
 const control=screen.getByRole('button',{name});expect(control).toHaveAttribute('tabindex','0');fireEvent.keyDown(control,{key:'Enter'});
 }
 expect(choose).toHaveBeenCalledTimes(6);choose.mockRestore();
 });

 it('supports keyboard access to the logo uploader and gives color and song controls names',async()=>{
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await waitFor(()=>expect(screen.getByRole('group',{name:'QR code design'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button',{name:'Color'}));
  expect(screen.getByRole('button',{name:'Background color: #FFFFFF'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Dots color: #000000'})).toBeInTheDocument();
  expect(screen.getByRole('combobox',{name:'Maximum song requests per guest'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Logo'}));
  const upload=screen.getByRole('button',{name:'Upload QR logo'});
  expect(upload).toHaveAttribute('tabindex','0');
  const choose=vi.spyOn(HTMLInputElement.prototype,'click').mockImplementation(()=>{});
  fireEvent.keyDown(upload,{key:'Enter'});fireEvent.keyDown(upload,{key:' '});fireEvent.keyDown(upload,{key:'ArrowDown'});
  expect(choose).toHaveBeenCalledTimes(2);choose.mockRestore();
 });
 it('associates the event selector with its visible label',()=>{
  render(<QRCodeSeatingChart events={[event]} eventsLoading={false} selectedEventId={null}/>);
  expect(screen.getByRole('combobox',{name:'Choose Event:'})).toBeInTheDocument();
  expect(screen.getByLabelText('Choose Event:')).toHaveAttribute('id','qr-event-selection');
 });
 it('names each shape group and exposes the selected option without mixing the groups',async()=>{
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  expect(screen.getByRole('group',{name:'QR code design'})).toBeDisabled();
  await waitFor(()=>expect(screen.getByRole('group',{name:'QR code design'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button',{name:'Shape & Form'}));
  const circle=screen.getByRole('button',{name:'Dots shape: circle'});
  expect(screen.getByRole('button',{name:'Dots shape: square'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(circle);
  await waitFor(()=>expect(circle).toHaveAttribute('aria-pressed','true'));
  expect(screen.getByRole('button',{name:'Dots shape: square'})).toHaveAttribute('aria-pressed','false');
  expect(screen.getByRole('button',{name:'Marker border shape: square'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button',{name:'Marker center shape: square'})).toHaveAttribute('aria-pressed','true');
 });
});


describe('QR readiness and persistence', () => {
 it('does not save a loaded design until the user changes it',async()=>{
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  await new Promise(resolve=>setTimeout(resolve,600));
  expect(mock.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Shape & Form'}));
  fireEvent.click(screen.getByRole('button',{name:'Dots shape: circle'}));
  await waitFor(()=>expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({event_id:event.id,dots_shape:'circle'}),expect.any(Set),expect.any(Function)));
 });
 it('does not generate or export a default QR while the saved design is still loading',async()=>{
  let resolve!:(value:any)=>void;
  mock.read.mockReturnValue(new Promise(yes=>{resolve=yes;}));
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await new Promise(yes=>setTimeout(yes,200));
  expect(mock.generate).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'PNG'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'JPG'})).toBeDisabled();
  resolve({data:{dots_shape:'circle'},error:null});
  await screen.findByRole('img',{name:'QR Code Preview'});
  expect(mock.generate.mock.calls[0][1].dots_shape).toBe('circle');
  expect(screen.getByRole('button',{name:'PNG'})).toBeEnabled();
 });
 it('disables exports rather than retaining an outdated preview after a failed render',async()=>{
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  mock.generate.mockRejectedValue(new Error('Logo unavailable'));
  fireEvent.click(screen.getByRole('button',{name:'Shape & Form'}));
  fireEvent.click(screen.getByRole('button',{name:'Dots shape: circle'}));
  await waitFor(()=>expect(screen.queryByRole('img',{name:'QR Code Preview'})).not.toBeInTheDocument());
  expect(screen.getByRole('button',{name:'PNG'})).toBeDisabled();
 });
});

describe('QR failure recovery and navigation',()=>{
 it('retries a failed saved-design load without writing defaults',async()=>{
  mock.read.mockRejectedValueOnce(new Error('Temporary network error'));
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load QR design');
  expect(screen.getByRole('group',{name:'QR code design'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));
  await screen.findByRole('img',{name:'QR Code Preview'});
  expect(mock.save).not.toHaveBeenCalled();
 });
 it('retries a failed QR render and re-enables export only after success',async()=>{
  mock.generate.mockRejectedValueOnce(new Error('Temporary image error'));
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not generate QR code');
  expect(screen.getByRole('button',{name:'PNG'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));
  await screen.findByRole('img',{name:'QR Code Preview'});
  expect(screen.getByRole('button',{name:'PNG'})).toBeEnabled();
 });
 it('flushes the final edited design when navigating away before debounce completes',async()=>{
  const view=render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  fireEvent.click(screen.getByRole('button',{name:'Shape & Form'}));
  fireEvent.click(screen.getByRole('button',{name:'Dots shape: circle'}));
  expect(mock.save).not.toHaveBeenCalled();
  view.unmount();
  await waitFor(()=>expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({event_id:event.id,dots_shape:'circle'}),expect.any(Set),expect.any(Function)));
 });
});

describe('visible QR export controls',()=>{
 it('exports the current edited preview to PDF and blocks duplicate downloads while busy',async()=>{
  const pdf={fixture:true} as any;
  const create=vi.spyOn(qrExports,'createCustomerQrPDF').mockResolvedValue(pdf);
  let finish!:()=>void;
  const save=vi.spyOn(pdfExports,'savePdfAsync').mockReturnValue(new Promise<void>(yes=>{finish=yes;}));
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  mock.generate.mockResolvedValue('data:image/png;base64,ZWRpdGVk');
  fireEvent.click(screen.getByRole('button',{name:'Shape & Form'}));
  fireEvent.click(screen.getByRole('button',{name:'Dots shape: circle'}));
  await waitFor(()=>expect(screen.getByRole('img',{name:'QR Code Preview'})).toHaveAttribute('src','data:image/png;base64,ZWRpdGVk'));
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(pdf,'qr-code-Existing Event.pdf'));
  expect(create).toHaveBeenCalledWith('data:image/png;base64,ZWRpdGVk');
  for(const name of ['PNG','JPG','Download PDF']) expect(screen.getByRole('button',{name})).toBeDisabled();
  finish();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled());
 });
 it('reports a failed PDF export and allows retry',async()=>{
  vi.spyOn(qrExports,'createCustomerQrPDF').mockRejectedValue(new Error('PDF failed'));
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Error downloading PDF'})));
  expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();
 });
 it('delivers PNG and converted JPG through the attached Blob download helper',async()=>{
  const download=vi.spyOn(qrExports,'downloadCustomerQrImage').mockResolvedValue(undefined);
  const convert=vi.spyOn(qrExports,'createCustomerQrJPG').mockResolvedValue('data:image/jpeg;base64,ZmFrZQ==');
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  const image=await screen.findByRole('img',{name:'QR Code Preview'});
  fireEvent.click(screen.getByRole('button',{name:'PNG'}));
  await waitFor(()=>expect(download).toHaveBeenCalledWith(image.getAttribute('src'),'qr-code-Existing Event.png'));
  await waitFor(()=>expect(screen.getByRole('button',{name:'JPG'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'JPG'}));
  await waitFor(()=>expect(download).toHaveBeenCalledWith('data:image/jpeg;base64,ZmFrZQ==','qr-code-Existing Event.jpg'));
  expect(convert).toHaveBeenCalledWith(image.getAttribute('src'));
 });
});


describe('QR palette colour selections',()=>{
 it.each([['Dots color','dots_color'],['Marker border color','marker_border_color'],['Marker center color','marker_center_color']])('preserves repeated %s selections in the preview and saved design',async(label,field)=>{
  render(<QRCodeMainCard eventId={event.id} event={event}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});
  fireEvent.click(screen.getByRole('button',{name:'Color'}));
  fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+label+':')}));
  for(const color of ['#FF0000','#00FF00','#FFD700','#0000FF','#FFB5B5','#FFFFFF','#660000']){
   fireEvent.click(screen.getAllByTitle(color)[0]);
   await waitFor(()=>expect(mock.generate).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({[field]:color})));
   expect(screen.getByRole('button',{name:label+': '+color})).toBeInTheDocument();
  }
  await waitFor(()=>expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({[field]:'#660000'}),expect.any(Set),expect.any(Function)));
 });
});
