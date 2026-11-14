import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignagePage } from './SignagePage';
import { generateInvitationQR } from '@/lib/invitationQR';
import { exportSignagePDF } from '@/lib/signagePdfExporter';

const testState = vi.hoisted(() => ({
  galleryLoading: true,
  isAdmin: true,
  signageSettings: {
    id: 'settings-1',
    event_id: 'event-1',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    background_image_url: null,
    background_image_print_url: null,
    background_image_type: 'none',
    background_image_opacity: 100,
    background_image_x_position: 50,
    background_image_y_position: 50,
    text_zones: [],
    qr_config: {
      enabled: false,
      x_percent: 50,
      y_percent: 82,
      size_percent: 22,
      rotation: 0,
      event_id: null,
    },
    notes: '',
  },
}));

vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [{
      id: 'event-1',
      name: "Jason & Linda's Wedding",
      partner1_name: 'Jason',
      partner2_name: 'Linda',
      date: '2026-12-20',
      venue: 'Sheldon Receptions',
    }],
    loading: false,
  }),
}));

vi.mock('@/hooks/useSignageSettings', () => ({
  DEFAULT_PORTRAIT_QR: testState.signageSettings.qr_config,
  DEFAULT_LANDSCAPE_QR: testState.signageSettings.qr_config,
  useSignageSettings: () => ({
    settings: testState.signageSettings,
    asInvitationSettings: testState.signageSettings,
    loading: false,
    updateSettings: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSignageGallery', () => ({
  useSignageGallery: () => ({
    images: [{
      id: 'sign-1',
      name: 'Classic seating sign',
      category: 'Classic',
      image_url: 'https://example.test/master.jpg',
      preview_url: 'https://example.test/preview.jpg',
      thumbnail_url: 'https://example.test/thumb.jpg',
      sort_order: 1,
      created_at: '2026-08-16T00:00:00Z',
      categories: ['Classic'],
    }],
    categoriesWithCounts: [{ name: 'Classic', count: 1 }],
    loading: testState.galleryLoading,
    error: null,
    removeImageFromGallery: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: testState.isAdmin }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/imagePipeline', () => ({
  checkPrintFit: vi.fn(() => ({ ok: true })),
  useOptimizedPreview: () => ({ url: null }),
}));

vi.mock('@/lib/invitationQR', () => ({
  generateInvitationQR: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
}));

vi.mock('@/lib/signagePdfExporter', () => ({ exportSignagePDF: vi.fn() }));
vi.mock('@/lib/invitationExporter', () => ({
  exportInvitationPDF: vi.fn(),
  exportInvitationPNG: vi.fn(),
}));

vi.mock('../Invitations/InvitationCardPreview', () => ({
  InvitationCardPreview: ({ documentRef }: any) => <div ref={documentRef}>Seating sign preview</div>,
}));

vi.mock('@/components/ui/PinchZoomContainer', () => ({
  PinchZoomContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../Invitations/InvitationCardCustomizer', async () => {
  const ReactModule = await import('react');
  return {
    InvitationCardCustomizer: ({ GalleryModalComponent: GalleryModal, qrDataUrl }: any) => {
      const [open, setOpen] = ReactModule.useState(false);
      return (
        <div>
          <output aria-label="Generated QR">{qrDataUrl||"not ready"}</output><button type="button" onClick={() => setOpen(true)}>Template Library</button>
          <GalleryModal open={open} onOpenChange={setOpen} onSelectImage={vi.fn()} />
        </div>
      );
    },
  };
});

vi.mock('./SignageBulkUploader', () => ({
  SignageBulkUploader: React.forwardRef(() => (
    <section aria-label="Admin upload">
      <label htmlFor="route-upload-category">Category for this upload</label>
      <input id="route-upload-category" />
      <button type="button">Choose images</button>
      <button type="button">Upload</button>
    </section>
  )),
}));

describe('Signage QR event identity',()=>{it('never displays the previous event QR while a new event QR is loading',async()=>{
 const original={...testState.signageSettings.qr_config};const generate=vi.mocked(generateInvitationQR);generate.mockResolvedValueOnce('first-event-qr');
 const events=[{id:'first',slug:'first-event',name:'First'},{id:'second',slug:'second-event',name:'Second'}] as any;
 testState.signageSettings.qr_config={...original,enabled:true,event_id:'first' as any};
 const view=()=> <MemoryRouter><SignagePage selectedEventId="first" onEventSelect={vi.fn()} events={events} eventsLoading={false}/></MemoryRouter>;
 try{const {rerender}=render(view());await waitFor(()=>expect(screen.getByLabelText('Generated QR')).toHaveTextContent('first-event-qr'));
 generate.mockImplementationOnce(()=>new Promise(()=>{}));testState.signageSettings.qr_config={...original,enabled:true,event_id:'second' as any};rerender(view());
 expect(screen.getByLabelText('Generated QR')).toHaveTextContent('not ready');
 expect(screen.getByRole('button',{name:'Download Print-Ready PDF'})).toBeDisabled();
 }finally{testState.signageSettings.qr_config=original;}
 });});