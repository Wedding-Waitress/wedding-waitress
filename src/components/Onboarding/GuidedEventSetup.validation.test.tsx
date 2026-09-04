import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuidedSetupAnswers, GuidedSetupDraft } from '@/lib/guidedEventSetup';

const mocks = vi.hoisted(() => ({
  answers: {} as GuidedSetupAnswers,
  save: vi.fn(),
  complete: vi.fn(async () => 'event-1'),
  plan: { guest_limit: 100, table_limit: 20, status: 'active', is_read_only: false, expires_at: null } as Record<string, unknown> | null,
  isAdmin: false,
}));

vi.mock('@/contexts/AuthenticatedSessionContext', () => ({
  useAuthenticatedSession: () => ({ session: { user: { id: 'user-1' } } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { first_name: 'Nader', last_name: 'Elalfy' }, loading: false }),
}));

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({ plan: mocks.plan, loading: false }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: mocks.isAdmin, loading: false }),
}));

vi.mock('./OnboardingAudio', () => ({ OnboardingAudio: () => <div data-testid="audio-control" /> }));

vi.mock('@/lib/guidedEventSetup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guidedEventSetup')>();
  const makeDraft = (answers: GuidedSetupAnswers, currentStep = 4): GuidedSetupDraft => ({
    id: 'draft-1', user_id: 'user-1', mode: 'additional_event', current_step: currentStep,
    answers, created_event_id: null, creation_started_at: null, completed_at: null,
    created_at: '2026-09-02T00:00:00Z', updated_at: '2026-09-02T00:00:00Z',
  });
  return {
    ...actual,
    loadActiveGuidedSetup: vi.fn(async () => makeDraft(mocks.answers)),
    beginGuidedSetup: vi.fn(async () => makeDraft(mocks.answers)),
    saveGuidedSetup: vi.fn(async (_id: string, answers: GuidedSetupAnswers, currentStep: number) => {
      mocks.save(answers, currentStep);
      return makeDraft(answers, currentStep);
    }),
    completeGuidedSetup: mocks.complete,
  };
});

import { GuidedEventSetup } from './GuidedEventSetup';

const renderPageFour = () => render(
  <MemoryRouter initialEntries={['/onboarding/event-setup?mode=additional&step=4']}>
    <Routes><Route path="/onboarding/event-setup" element={<GuidedEventSetup />} /></Routes>
  </MemoryRouter>,
);

const renderStep = (step: number) => render(
  <MemoryRouter initialEntries={[`/onboarding/event-setup?mode=additional&step=${step}`]}>
    <Routes><Route path="/onboarding/event-setup" element={<GuidedEventSetup />} /></Routes>
  </MemoryRouter>,
);

describe('Guided Event Setup validation experience', () => {
  beforeEach(() => {
    mocks.save.mockClear();
    mocks.complete.mockClear();
    mocks.answers = {};
    mocks.plan = { guest_limit: 100, table_limit: 20, status: 'active', is_read_only: false, expires_at: null };
    mocks.isAdmin = false;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
  });

  it('proceeds from Page 4 with the exact live-review values', async () => {
    mocks.answers = {
      dateChoice: 'exact', exactDate: '2026-12-20', startTime: '04:00', finishTime: '23:00',
      rsvpDeadline: '2026-11-20', locationChoice: 'booked', venueName: 'Sheldon Reception',
      venueAddress: '608-614 Somerville Rd', suburb: 'Sunshine West', state: 'VIC',
      postcode: '3020', country: 'Australia',
    };
    renderPageFour();
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));
    expect(await screen.findByRole('heading', { name: /what parts of the celebration|how is your celebration/i })).toBeInTheDocument();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ exactDate: '2026-12-20', startTime: '04:00', finishTime: '23:00' }), 5);
  });

  it('shows multiple red errors, announces them and focuses the first invalid group', async () => {
    renderPageFour();
    const next = await screen.findByRole('button', { name: /next/i });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(await screen.findByText(/please correct 2 items/i)).toBeInTheDocument();
    const dateGroup = screen.getByRole('radiogroup', { name: 'Date certainty' });
    expect(dateGroup).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(dateGroup).toHaveFocus());
  });

  it('removes a field error immediately when the answer is corrected', async () => {
    mocks.answers = { dateChoice: 'undecided' };
    renderPageFour();
    fireEvent.click(await screen.findByRole('radio', { name: 'We have booked a venue' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'We have booked a venue' })).toHaveAttribute('aria-checked', 'true'));
    const venue = document.querySelector<HTMLInputElement>('[data-validation-field="venueName"] input');
    if (!venue) throw new Error('Venue name field did not render.');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(venue).toBeRequired();
    expect(venue).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(venue, { target: { value: 'Sheldon Reception' } });
    await waitFor(() => expect(venue).toHaveAttribute('aria-invalid', 'false'));
    expect(screen.queryByText('Enter the booked venue name.')).not.toBeInTheDocument();
  });

  it('autosaves entered venue details and restores them after refresh', async () => {
    mocks.answers = { dateChoice: 'undecided', locationChoice: 'in-mind', country: 'Australia' };
    const firstRender = renderPageFour();
    const contact = await screen.findByLabelText(/venue contact person/i);
    fireEvent.change(contact, { target: { value: 'Alex Smith' } });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ venueContactName: 'Alex Smith' }), 4), { timeout: 2000 });

    const savedAnswers = mocks.save.mock.calls.at(-1)?.[0] as GuidedSetupAnswers;
    firstRender.unmount();
    mocks.answers = savedAnswers;
    renderPageFour();
    expect(await screen.findByDisplayValue('Alex Smith')).toBeInTheDocument();
  });

  it('allows Back without erasing incomplete Page 4 answers', async () => {
    mocks.answers = { dateChoice: 'exact', exactDate: '2026-12-20', venueName: 'Saved venue' };
    renderPageFour();
    fireEvent.click(await screen.findByRole('button', { name: /back/i }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ exactDate: '2026-12-20', venueName: 'Saved venue' }), 3));
  });

  it('shows only the supported wedding celebration choices without redundant labels', async () => {
    mocks.answers = { celebrationType: 'wedding' };
    renderStep(5);
    expect(await screen.findByRole('heading', { name: 'What parts of the celebration are you planning?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ceremony and reception' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ceremony only' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Reception only' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'We haven’t decided yet' })).toBeInTheDocument();
    expect(screen.queryByText('One combined celebration')).not.toBeInTheDocument();
    expect(screen.queryByText('Celebration parts')).not.toBeInTheDocument();
  });

  it('validates different locations and clears hidden branch errors when undecided', async () => {
    mocks.answers = { celebrationType: 'wedding', partsChoice: 'ceremony-reception' };
    renderStep(5);
    fireEvent.click(await screen.findByRole('radio', { name: 'No — Different locations' }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Please correct 4 items:')).toBeInTheDocument();
    const locationGroup = screen.getByRole('radiogroup', { name: 'Ceremony and reception locations' });
    fireEvent.click(within(locationGroup).getByRole('radio', { name: 'We haven’t decided yet' }));
    expect(screen.queryByText('Please correct 4 items:')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ceremony location name')).not.toBeInTheDocument();
  });

  it('uses clean visible labels and keeps required accessibility metadata', async () => {
    mocks.answers = { celebrationType: 'wedding' };
    renderStep(3);
    const firstName = await screen.findByLabelText('Your first name');
    expect(firstName).toBeRequired();
    expect(firstName).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Your surname')).not.toBeRequired();
    expect(document.body.textContent).not.toMatch(/\((?:required|optional|editable)\)/i);
  });

  it('does not show required, optional or editable suffixes on any onboarding step', async () => {
    mocks.answers = {
      celebrationType: 'wedding', customerFirstName: 'Nader', partnerFirstName: 'Nahla', eventName: 'Wedding',
      dateChoice: 'undecided', locationChoice: 'undecided', partsChoice: 'ceremony-reception', sameVenue: 'undecided',
      eventFormat: 'seated', approximateInvited: '120', expectedAttending: '100', tableCreation: 'automatic',
      tableStyle: 'round', tableCapacity: '10', headTable: 'yes', headTableCount: '4', guestTableCount: '10',
      budgetChoice: 'exact', budgetExact: '35000',
    };
    for (let step = 1; step <= 10; step += 1) {
      const view = renderStep(step);
      await screen.findByText(`Step ${step} of 10`);
      expect(document.body.textContent).not.toMatch(/\((?:required|optional|editable)\)/i);
      expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('shows the renamed table field and customer-friendly calculation', async () => {
    mocks.answers = { eventFormat: 'seated', expectedAttending: '100', tableCreation: 'automatic', tableStyle: 'round', tableCapacity: '10', headTable: 'yes', headTableCount: '4', guestTableCount: '10' };
    renderStep(7);
    expect(await screen.findByLabelText('Number of guest tables to create')).toHaveValue(10);
    expect(screen.getByText(/Based on 100 expected guests, 4 people at the Head Table and 10 guests per table/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Suggested guest tables');
  });

  it('renders polished Page 9 summaries without internal values', async () => {
    mocks.answers = {
      celebrationType: 'wedding', eventName: 'Nader & Nahla’s Wedding', customerFirstName: 'Nader', partnerFirstName: 'Nahla',
      dateChoice: 'undecided', locationChoice: 'booked', venueName: 'Main location', partsChoice: 'ceremony-reception', sameVenue: 'no',
      ceremonyVenue: 'Ceremony Place', ceremonyAddress: '1 Ceremony Road', receptionVenue: 'Reception Place', receptionAddress: '2 Reception Road',
      eventFormat: 'seated', approximateInvited: '120', expectedAttending: '100', adults: '85', children: '10', vendors: '5',
      tableCreation: 'automatic', tableStyle: 'round', tableCapacity: '10', headTable: 'yes', headTableCount: '4', guestTableCount: '10', budgetChoice: 'exact', budgetExact: '35000',
    };
    renderStep(9);
    expect(await screen.findByRole('heading', { name: 'Celebration and locations' })).toBeInTheDocument();
    expect(screen.getByText(/Different locations/)).toBeInTheDocument();
    expect(screen.getByText(/Ceremony: Ceremony Place/)).toBeInTheDocument();
    expect(screen.getByText(/Reception: Reception Place/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guests' }).parentElement).toHaveTextContent('120 invited · 100 expected');
    expect(screen.getByText('10 round guest tables and one Head Table for 4 people')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ceremony-reception|same venue:|\bseated\b/);
  });

  it('resolves owner-admin guest allowance without an em dash', async () => {
    mocks.plan = null;
    mocks.isAdmin = true;
    mocks.answers = { eventFormat: 'seated', approximateInvited: '120', expectedAttending: '100' };
    renderStep(6);
    expect(await screen.findByText('unlimited')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('— actual guest records');
  });

  it('blocks an unresolved non-admin allowance on Page 6 with an account path', async () => {
    mocks.plan = null;
    mocks.answers = { eventFormat: 'seated', approximateInvited: '120', expectedAttending: '100' };
    renderStep(6);
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not verify your Guest List allowance');
    expect(screen.getByRole('button', { name: 'Review account' })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalledWith(expect.anything(), 7);
  });

  it('blocks expired access on Page 6 before review', async () => {
    mocks.plan = { guest_limit: 100, table_limit: 20, status: 'expired', is_read_only: true, expires_at: '2026-01-01T00:00:00Z' };
    mocks.answers = { eventFormat: 'seated', approximateInvited: '120', expectedAttending: '100' };
    renderStep(6);
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('plan is not active');
    expect(screen.getByRole('button', { name: 'Review account' })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalledWith(expect.anything(), 7);
  });

  it('prevents repeated Create My Event clicks', async () => {
    mocks.answers = {
      celebrationType: 'wedding', customerFirstName: 'Nader', partnerFirstName: 'Nahla', eventName: 'Wedding',
      dateChoice: 'undecided', locationChoice: 'undecided', partsChoice: 'ceremony-only', eventFormat: 'cocktail',
      approximateInvited: '120', expectedAttending: '100', budgetChoice: 'exact', budgetExact: '35000',
    };
    renderStep(9);
    const create = await screen.findByRole('button', { name: /create my event/i });
    fireEvent.click(create); fireEvent.click(create);
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1));
  });
});
