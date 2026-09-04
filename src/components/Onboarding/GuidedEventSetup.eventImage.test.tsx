import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CelebrationType, GuidedSetupAnswers, GuidedSetupDraft } from '@/lib/guidedEventSetup';

const mocks = vi.hoisted(() => ({ answers: {} as GuidedSetupAnswers, save: vi.fn() }));

vi.mock('@/contexts/AuthenticatedSessionContext', () => ({
  useAuthenticatedSession: () => ({ session: { user: { id: 'user-1' } } }),
}));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { first_name: 'Nader', last_name: 'Elalfy' }, loading: false }),
}));
vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({ plan: { guest_limit: 100, table_limit: 20 }, loading: false }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false, loading: false }),
}));
vi.mock('./OnboardingAudio', () => ({ OnboardingAudio: () => null }));
vi.mock('@/lib/eventImage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/eventImage')>()),
  probeEventImageStorage: vi.fn().mockResolvedValue(undefined),
  createEventImageSignedUrl: vi.fn().mockResolvedValue('blob:event-image'),
}));
vi.mock('@/lib/guidedEventSetup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guidedEventSetup')>();
  const draft = (): GuidedSetupDraft => ({
    id: 'draft-1', user_id: 'user-1', mode: 'additional_event', current_step: 3,
    answers: mocks.answers, created_event_id: null, creation_started_at: null, completed_at: null,
    created_at: '2026-09-02T00:00:00Z', updated_at: '2026-09-02T00:00:00Z',
  });
  return {
    ...actual,
    loadActiveGuidedSetup: vi.fn(async () => draft()),
    beginGuidedSetup: vi.fn(async () => draft()),
    saveGuidedSetup: mocks.save.mockImplementation(async (_id: string, answers: GuidedSetupAnswers, currentStep: number) => ({ ...draft(), answers, current_step: currentStep })),
  };
});

import { GuidedEventSetup } from './GuidedEventSetup';

const renderSetup = (answers: GuidedSetupAnswers, step = 3) => {
  mocks.answers = answers;
  return render(
    <MemoryRouter initialEntries={[`/onboarding/event-setup?mode=additional&step=${step}`]}>
      <Routes><Route path="/onboarding/event-setup" element={<GuidedEventSetup />} /></Routes>
    </MemoryRouter>,
  );
};

describe('Guided Event Setup Page 3 photo or logo section', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    mocks.save.mockClear();
  });

  it.each([
    ['wedding', 'Add a photo of you both'],
    ['birthday', 'Add an event or celebration photo'],
    ['corporate', 'Add an event photo or logo'],
  ] as const)('renders the %s upload wording', async (type, heading) => {
    renderSetup({ celebrationType: type, eventName: 'Test Event' });
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photo or Logo' })).toBeInTheDocument();
    expect(screen.getByText(/drag and drop a file here/i)).toBeInTheDocument();
    expect(screen.getByText('JPG, PNG or WebP—maximum 5 MB.')).toBeInTheDocument();
  });

  it('restores a saved draft preview and still allows Next without an upload', async () => {
    const savedImage = {
      eventImagePath: 'user-1/drafts/draft-1/image.jpg', eventImageFit: 'cover' as const,
      eventImagePositionX: 35, eventImagePositionY: 65, eventImageZoom: 145,
    };
    const view = renderSetup({
      celebrationType: 'wedding', eventName: 'Nader and Nahla', customerFirstName: 'Nader', partnerFirstName: 'Nahla',
      ...savedImage,
    });
    const preview = await screen.findByAltText('Event photo or logo preview');
    expect(preview).toHaveStyle({ objectPosition: '35% 65%' });
    expect(preview.style.transform).toContain('scale(1.45)');
    view.unmount();

    renderSetup({ celebrationType: 'wedding', eventName: 'Nader and Nahla', customerFirstName: 'Nader', partnerFirstName: 'Nahla' });
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));
    expect(await screen.findByRole('heading', { name: /when and where/i })).toBeInTheDocument();
  });

  it('displays the saved image on Page 9 Review', async () => {
    renderSetup({
      celebrationType: 'corporate', eventName: 'Annual Dinner', organiserName: 'Nader',
      eventImagePath: 'user-1/drafts/draft-1/logo.webp', eventImageFit: 'contain',
      eventImagePositionX: 50, eventImagePositionY: 50, eventImageZoom: 100,
    }, 9);
    expect(await screen.findByRole('heading', { name: /review your event setup/i })).toBeInTheDocument();
    expect(screen.getByText('Photo or logo')).toBeInTheDocument();
    expect(await screen.findByAltText('Event photo or logo')).toHaveStyle({ objectFit: 'contain' });
  });

  it('renders the exact saved Fill Frame crop on Page 9 Review', async () => {
    renderSetup({
      celebrationType: 'wedding', eventName: 'Nader and Nahla', customerFirstName: 'Nader', partnerFirstName: 'Nahla',
      eventImagePath: 'user-1/drafts/draft-1/couple.jpg', eventImageFit: 'cover',
      eventImagePositionX: 20, eventImagePositionY: 75, eventImageZoom: 180,
    }, 9);
    const image = await screen.findByAltText('Event photo or logo');
    expect(image).toHaveStyle({ objectFit: 'cover', objectPosition: '20% 75%' });
    expect(image.style.transform).toContain('scale(1.8)');
  });

  it('autosaves zoom and restores it when the draft resumes', async () => {
    renderSetup({
      celebrationType: 'wedding', eventName: 'Nader and Nahla', customerFirstName: 'Nader', partnerFirstName: 'Nahla',
      eventImagePath: 'user-1/drafts/draft-1/image.jpg', eventImageFit: 'cover',
      eventImagePositionX: 40, eventImagePositionY: 60, eventImageZoom: 125,
    });
    const zoom = await screen.findByLabelText('Zoom');
    expect(zoom).toHaveValue('125');
    fireEvent.change(zoom, { target: { value: '160' } });
    fireEvent.blur(zoom);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('draft-1', expect.objectContaining({ eventImageZoom: 160 }), 3));
  });
});
