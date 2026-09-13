import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({preview:vi.fn(),pdf:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('@/components/Dashboard/Invitations/InvitationCardPreview',()=>({InvitationCardPreview:(props:any)=>{mocks.preview(props);return <div ref={props.documentRef} data-testid="sign-document">{props.eventData.couple_names}</div>;}}));
vi.mock('@/lib/signagePdfExporter',()=>({exportSignagePDF:mocks.pdf}));
import {AdminReadOnlySignage} from './AdminReadOnlySignage';
const savedSettings={id:'sign',event_id:'event',user_id:'customer',orientation:'portrait',background_color:'#ffffff',background_image_url:null,background_image_print_url:null,
 background_image_type:'none',background_image_x_position:50,background_image_y_position:50,background_image_opacity:100,text_zones:[],
 qr_config:{enabled:false,x_percent:50,y_percent:82,size_percent:22,rotation:0,event_id:null}};
const props={ownerId:'customer',eventId:'event',savedSettings,event:{name:'Actual wedding',date:'2027-09-05',partner1_name:'Élodie',partner2_name:'O’Connor'}};
beforeEach(()=>{mocks.preview.mockClear();mocks.pdf.mockReset().mockResolvedValue(undefined);mocks.invoke.mockReset();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});
afterEach(()=>vi.unstubAllEnvs());
it('renders verified uploaded Signage artwork and clears the document before fresh access verification',async()=>{
 const background='https://isolated.test/storage/v1/object/public/invitations/customer/signage/file.png';
 const signed='https://isolated.test/storage/v1/object/sign/invitations/customer/signage/file.png?token=fixture';
 mocks.invoke.mockResolvedValue({data:{read_only:true,url:signed,expires_at:new Date(Date.now()+60000).toISOString()},error:null});
 render(<AdminReadOnlySignage {...props} savedSettings={{...savedSettings,background_image_url:background,background_image_type:'full'}}/>);
 expect(screen.queryByTestId('sign-document')).not.toBeInTheDocument();await screen.findByTestId('sign-document');
 expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',{body:expect.objectContaining({kind:'signage_background',customer_id:'customer',event_id:'event',record_id:'sign'})});
 expect(mocks.preview.mock.calls.at(-1)?.[0].settings.background_image_url).toBe(signed);
 mocks.invoke.mockImplementation(()=>new Promise(()=>{}));act(()=>window.dispatchEvent(new Event('focus')));
 expect(screen.queryByTestId('sign-document')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Download sign PDF'})).not.toBeInTheDocument();
});
it('uses the exact public Signage gallery master without a private-media request',()=>{
 const background='https://isolated.test/storage/v1/object/public/signage-gallery/master.png';
 render(<AdminReadOnlySignage {...props} savedSettings={{...savedSettings,background_image_print_url:background,background_image_type:'full'}}/>);
 expect(mocks.preview.mock.calls.at(-1)?.[0].settings.background_image_url).toBe(background);expect(mocks.invoke).not.toHaveBeenCalled();
});
it.each([undefined,null,{}, {...savedSettings,user_id:'other'}])('never invents missing or foreign saved Signage (%j)',savedSettings=>{
 render(<AdminReadOnlySignage {...props} savedSettings={savedSettings}/>);expect(screen.getByText(/A default customer sign has not been substituted/)).toBeInTheDocument();expect(mocks.preview).not.toHaveBeenCalled();
});
it('uses the same renderer, saved text and paper sizes with no write controls',async()=>{
 render(<AdminReadOnlySignage {...props}/>);expect(screen.getByTestId('sign-document')).toHaveTextContent('Élodie & O’Connor');
 expect(mocks.preview.mock.calls.at(-1)?.[0]).toMatchObject({paperSize:{widthMm:594,heightMm:841},backgroundFit:'cover',documentId:'seating-chart-sign',normaliseQrControls:true,qrWhitePlate:true});
 expect(mocks.preview.mock.calls.at(-1)?.[0].onZoneUpdate).toBeUndefined();
 fireEvent.change(screen.getByRole('combobox',{name:'Viewing and export size'}),{target:{value:'a3'}});
 fireEvent.click(screen.getByRole('button',{name:'Download sign PDF'}));
 await waitFor(()=>expect(mocks.pdf).toHaveBeenCalledWith({pageElement:screen.getByTestId('sign-document'),widthMm:297,heightMm:420},'WW-Sign-Actual wedding-A3-Portrait.pdf'));
});
it.each([{...savedSettings,background_image_url:'https://unverified.test/file.png'},
 {...savedSettings,qr_config:{...savedSettings.qr_config,enabled:true,event_id:'missing'}},
 {...savedSettings,text_zones:[{id:'broken'}]}])('refuses incomplete private artwork, QR or geometry (%j)',savedSettings=>{
 render(<AdminReadOnlySignage {...props} savedSettings={savedSettings}/>);expect(screen.getByRole('alert')).toBeInTheDocument();expect(mocks.preview).not.toHaveBeenCalled();
});
