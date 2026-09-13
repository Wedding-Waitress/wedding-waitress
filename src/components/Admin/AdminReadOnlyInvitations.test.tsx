import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {InvitationCardSettings} from '@/hooks/useInvitationCardSettings';
const mocks=vi.hoisted(()=>({exportPdf:vi.fn(),organizer:vi.fn(),preview:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
vi.mock('@/lib/invitationPreviewPdfExporter',()=>({exportInvitationPreviewPDF:mocks.exportPdf}));
vi.mock('@/components/Dashboard/Invitations/InvitationCardPreview',()=>({InvitationCardPreview:(props:any)=>{mocks.preview(props);return <div ref={props.documentRef} data-testid="authoritative-card">{props.eventData.couple_names}</div>;}}));
import {AdminReadOnlyInvitations} from './AdminReadOnlyInvitations';
const artwork={id:'saved-card',event_id:'event',user_id:'customer',name:'Saved thank you',card_type:'thank_you',card_size:'A6',orientation:'landscape',background_color:'#f8f1e5',background_image_type:'none',text_zones:[],font_color:'#2f1b14',qr_config:{enabled:false}} as unknown as InvitationCardSettings;
beforeEach(()=>{mocks.exportPdf.mockReset().mockResolvedValue(undefined);mocks.preview.mockClear();mocks.invoke.mockReset();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');});
afterEach(()=>{vi.unstubAllEnvs();});
it('renders actual saved settings with no organizer write controls and exports the same document geometry',async()=>{
 render(<AdminReadOnlyInvitations artworks={[artwork]} event={{name:'Wedding',partner1_name:'Élodie',partner2_name:"O'Connor"}} eventId="event"/>);
 expect(screen.getByTestId('authoritative-card')).toHaveTextContent("Élodie & O'Connor");
 const props=mocks.preview.mock.calls.at(-1)?.[0];expect(props.settings).toMatchObject(artwork);expect(props.onZoneUpdate).toBeUndefined();expect(props.onQrConfigUpdate).toBeUndefined();
 expect(screen.queryByRole('button',{name:/save|send|delete|create/i})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Download card PDF'}));
 await waitFor(()=>expect(mocks.exportPdf).toHaveBeenCalledWith({pageElement:screen.getByTestId('authoritative-card'),widthMm:148,heightMm:105},'Saved thank you-WeddingWaitress-Wedding.pdf'));
});
it('distinguishes absent payload from no saved artwork and never invents a default document',()=>{
 const {rerender}=render(<AdminReadOnlyInvitations artworks={undefined} event={{name:'Wedding'}} eventId="event"/>);expect(screen.getByText(/preview data is unavailable/)).toBeInTheDocument();
 rerender(<AdminReadOnlyInvitations artworks={[]} event={{name:'Wedding'}} eventId="event"/>);expect(screen.getByText('No saved Invitations or Cards recorded.')).toBeInTheDocument();expect(mocks.preview).not.toHaveBeenCalled();
});
it('does not silently omit a saved unverified background',()=>{
 render(<AdminReadOnlyInvitations artworks={[{...artwork,background_image_type:'full',background_image_url:'https://tracking.example/background.png'}]} event={{name:'Wedding'}} eventId="event"/>);
 expect(screen.getByRole('alert')).toHaveTextContent('verified read-only media');expect(mocks.preview).not.toHaveBeenCalled();expect(mocks.exportPdf).not.toHaveBeenCalled();
});
it('shows an uploaded background only after owned-record media verification and removes it during revalidation',async()=>{
 const url='https://isolated.test/storage/v1/object/sign/invitations/customer/invitations/file.png?token=fixture';
 mocks.invoke.mockResolvedValueOnce({data:{read_only:true,url,expires_at:new Date(Date.now()+600000).toISOString()},error:null});
 render(<AdminReadOnlyInvitations artworks={[{...artwork,background_image_type:'full',background_image_url:'https://isolated.test/storage/v1/object/public/invitations/customer/invitations/file.png'}]} event={{name:'Wedding'}} eventId="event" customerId="customer"/>);
 await waitFor(()=>expect(screen.getByTestId('authoritative-card')).toBeInTheDocument());
 expect(mocks.preview.mock.calls.at(-1)?.[0].settings.background_image_url).toBe(url);
 expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',expect.objectContaining({body:expect.objectContaining({customer_id:'customer',event_id:'event',record_id:'saved-card',kind:'invitation_background'})}));
 mocks.invoke.mockImplementation(()=>new Promise(()=>{}));
 fireEvent(window,new Event('focus'));
 expect(screen.queryByTestId('authoritative-card')).toBeNull();
 expect(screen.queryByRole('button',{name:'Download card PDF'})).toBeNull();
});
