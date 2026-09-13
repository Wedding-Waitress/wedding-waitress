import {act,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {buildDynamicQRUrl} from '@/lib/urlUtils';
const mocks=vi.hoisted(()=>({generate:vi.fn(),created:vi.fn(),invoke:vi.fn()}));
vi.mock('@/lib/advancedQRGenerator',()=>({AdvancedQRGenerator:class {
 constructor(...args:any[]){mocks.created(...args);}generate(...args:any[]){return mocks.generate(...args);}
}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{throw Error('Customer queries forbidden');},
 auth:{getUser:()=>{throw Error('Customer authentication forbidden');}},rpc:()=>{throw Error('QR creation forbidden');},functions:{invoke:mocks.invoke}}}));
import {AdminReadOnlyQRCode} from './AdminReadOnlyQRCode';
const settings={id:'design',user_id:'owner',event_id:'event',background_color:'#ffffff',foreground_color:'#2f1b14',dots_color:'#123456',marker_border_color:'#234567',
 marker_center_color:'#345678',dots_shape:'diamond',marker_border_shape:'rounded',marker_center_shape:'circle',center_image_url:null,center_image_size:22};
const dynamicRecord={user_id:'owner',current_event_id:'event',is_active:true,destination_type:'guest_lookup',code:'ACTUAL-QR'};
const props={ownerId:'owner',eventId:'event',eventName:'Saved wedding',settings,dynamicRecord};
describe('saved read-only QR design',()=>{
 beforeEach(()=>{mocks.generate.mockReset().mockResolvedValue('data:image/png;base64,fixture');mocks.created.mockClear();mocks.invoke.mockReset();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});
 afterEach(()=>vi.unstubAllEnvs());
 it('uses the same generator and rendering policy with the actual saved destination and no write controls',async()=>{
  render(<AdminReadOnlyQRCode {...props}/>);await screen.findByRole('img',{name:'QR Code Preview'});
  expect(mocks.created).toHaveBeenCalledWith(512,true,true);expect(mocks.generate).toHaveBeenCalledWith(buildDynamicQRUrl('ACTUAL-QR'),expect.objectContaining({
   event_id:'event',dots_color:'#123456',marker_border_color:'#234567',marker_center_color:'#345678',dots_shape:'diamond',marker_border_shape:'rounded',marker_center_shape:'circle',
   center_image_size:22,shape:'diamond',border_style:'none',background_image_url:undefined,output_size:512,output_format:'png',has_scan_text:false}));
  expect(screen.getByRole('button',{name:'Download PNG'})).toBeEnabled();
  expect(screen.getByLabelText('Saved QR Dots shape')).toHaveValue('diamond');expect(screen.getByLabelText('Saved QR Background colour')).toBeDisabled();
  expect(screen.queryByRole('button',{name:/save|reset|upload/i})).not.toBeInTheDocument();
 });
 it.each([undefined,{...settings,user_id:'foreign'},{...settings,event_id:'other'},{...settings,dots_shape:'invalid'}])('never substitutes missing or foreign customization (%j)',settings=>{
  render(<AdminReadOnlyQRCode {...props} settings={settings}/>);expect(screen.getByText(/A default customer QR has not been substituted/)).toBeInTheDocument();expect(mocks.generate).not.toHaveBeenCalled();
 });
 it.each([null,{...dynamicRecord,user_id:'foreign'},{...dynamicRecord,current_event_id:'other'},{...dynamicRecord,is_active:false},
  {...dynamicRecord,destination_type:'other'},{...dynamicRecord,code:'https://untrusted.test'}])('requires a genuine active owned destination (%j)',dynamicRecord=>{
  render(<AdminReadOnlyQRCode {...props} dynamicRecord={dynamicRecord}/>);expect(screen.getByRole('alert')).toHaveTextContent('No QR code or private link has been created');expect(mocks.generate).not.toHaveBeenCalled();
 });
 it('does not silently remove unverified saved logo artwork',()=>{
  render(<AdminReadOnlyQRCode {...props} settings={{...settings,center_image_url:'https://unverified.test/logo.png'}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('No incomplete QR is shown');expect(mocks.generate).not.toHaveBeenCalled();
 });
 it('uses the verified saved logo and immediately hides the QR while access is revalidated',async()=>{
  const logo='https://isolated.test/storage/v1/object/public/qr-assets/owner/event/qr-logo/file.png';
  const signed='https://isolated.test/storage/v1/object/sign/qr-assets/owner/event/qr-logo/file.png?token=fixture';
  mocks.invoke.mockResolvedValue({data:{read_only:true,url:signed,expires_at:new Date(Date.now()+60000).toISOString()},error:null});
  render(<AdminReadOnlyQRCode {...props} settings={{...settings,center_image_url:logo}}/>);await screen.findByRole('img',{name:'QR Code Preview'});
  expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',{body:expect.objectContaining({kind:'qr_logo',record_id:'design',customer_id:'owner',event_id:'event'})});
  expect(mocks.generate).toHaveBeenCalledWith(buildDynamicQRUrl('ACTUAL-QR'),expect.objectContaining({center_image_url:signed,center_image_size:22}));
  mocks.invoke.mockImplementation(()=>new Promise(()=>{}));act(()=>window.dispatchEvent(new Event('focus')));expect(screen.queryByRole('img',{name:'QR Code Preview'})).not.toBeInTheDocument();
 });
 it('hides old generated QR immediately and ignores a late response after destination changes',async()=>{
  let resolve!:(value:string)=>void;mocks.generate.mockImplementation(()=>new Promise(value=>{resolve=value;}));
  const view=render(<AdminReadOnlyQRCode {...props}/>);const oldResolve=resolve;
  mocks.generate.mockResolvedValue('data:image/png;base64,new-fixture');view.rerender(<AdminReadOnlyQRCode {...props} dynamicRecord={{...dynamicRecord,code:'NEW-QR'}}/>);
  await screen.findByRole('img',{name:'QR Code Preview'});await act(()=>oldResolve('data:image/png;base64,old-fixture'));
  expect(screen.getByRole('img',{name:'QR Code Preview'})).toHaveAttribute('src','data:image/png;base64,new-fixture');
 });
 it('fails a stalled generator within ten seconds and ignores its late output',async()=>{
  vi.useFakeTimers();
  try{
   let resolve!:(value:string)=>void;mocks.generate.mockImplementation(()=>new Promise(value=>{resolve=value;}));
   render(<AdminReadOnlyQRCode {...props}/>);
   await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
   expect(screen.getByRole('alert')).toHaveTextContent('The saved QR could not be rendered.');
   await act(async()=>resolve('data:image/png;base64,late'));
   expect(screen.queryByRole('img',{name:'QR Code Preview'})).not.toBeInTheDocument();
  }finally{vi.useRealTimers();}
 });
});
