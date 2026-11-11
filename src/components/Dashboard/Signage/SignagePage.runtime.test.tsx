import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignagePage } from './SignagePage';
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
    InvitationCardCustomizer: ({ GalleryModalComponent: GalleryModal }: any) => {
      const [open, setOpen] = ReactModule.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>Template Library</button>
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

describe('Seating Chart Signs route runtime', () => {
  it.each([1440, 768, 390])('orders sizes smallest first and exports each selected size at %ipx', async width => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    vi.mocked(exportSignagePDF).mockClear();
    render(<MemoryRouter><SignagePage selectedEventId="event-1" onEventSelect={vi.fn()} events={[{ id: 'event-1', name: 'Test Wedding' } as any]} eventsLoading={false} /></MemoryRouter>);
    const cards = screen.getAllByRole('button').filter(button => /^\s*A[0-3]/.test(button.textContent || ''));
    expect(cards.map(card => card.textContent?.trim().match(/^A[0-3]/)?.[0])).toEqual(['A3', 'A2', 'A1', 'A0']);
    expect(cards[2]).toHaveAttribute('aria-pressed', 'true');
    const sizes = [[297, 420], [420, 594], [594, 841], [841, 1189]];
    for (let index = 0; index < cards.length; index++) {
      fireEvent.click(cards[index]);
      expect(cards[index]).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Download Print-Ready PDF' }));
      await waitFor(() => expect(exportSignagePDF).toHaveBeenCalledTimes(index + 1));
      expect(vi.mocked(exportSignagePDF).mock.calls[index][0]).toMatchObject({ widthMm: sizes[index][0], heightMm: sizes[index][1] });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Download Print-Ready PDF' })).toBeEnabled());
    }
  });
  beforeEach(() => {
    testState.galleryLoading = true;
    testState.isAdmin = true;
  });

  it('renders the complete page while the closed library loads, then opens and toggles Admin Upload safely', () => {
    const route = (
      <MemoryRouter initialEntries={['/dashboard?tab=signage']}>
        <Routes>
          <Route
            path="/dashboard"
            element={<SignagePage
              selectedEventId="event-1"
              onEventSelect={vi.fn()}
              events={[{ id: 'event-1', name: 'Test Wedding', slug: 'test-wedding' } as any]}
              eventsLoading={false}
            />}
          />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(route);

    expect(screen.getByRole('heading', { name: 'Wedding Waitress Signs Studio' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Print & Export Studio' })).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    testState.galleryLoading = false;
    rerender(route);
    fireEvent.click(screen.getByRole('button', { name: 'Template Library' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Seating Chart Signs Template Library/i })).toBeInTheDocument();

    const adminUpload = screen.getByRole('button', { name: 'Admin Upload' });
    fireEvent.click(adminUpload);
    expect(screen.getByRole('region', { name: 'Admin upload' })).toBeInTheDocument();
    fireEvent.click(adminUpload);
    expect(screen.queryByRole('region', { name: 'Admin upload' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
