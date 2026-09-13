import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingPreferences } from './MarketingPreferences';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), preference: vi.fn(), auth: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.auth }, rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.preference }) }) }) } }));
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: 'alice', email: 'alice@example.test' } } });
  mocks.preference.mockResolvedValue({ data: null, error: null }); mocks.rpc.mockResolvedValue({ error: null }); });
describe('explicit marketing preference', () => {
  it('does not infer consent or write anything on visit', async () => {
    render(<MarketingPreferences />); const box = await screen.findByRole('checkbox');
    await waitFor(() => expect(box).toBeEnabled()); expect(box).not.toBeChecked(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('saves only a deliberate choice and cannot select someone else as subject', async () => {
    render(<MarketingPreferences />); const box = screen.getByRole('checkbox'); await waitFor(() => expect(box).toBeEnabled());
    fireEvent.click(box); expect(mocks.rpc).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Save email preference'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('set_my_marketing_preference', { p_opted_in: true }));
    expect(await screen.findByText(/saved: opted in/)).toBeInTheDocument();
  });
  it('does not reuse consent after a login-email change', async () => {
    mocks.preference.mockResolvedValue({ data: { status: 'opted_in', consent_email: 'previous@example.test' }, error: null });
    render(<MarketingPreferences />); await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('does not turn a missing migration into successful consent', async () => {
    mocks.preference.mockResolvedValue({ data: null, error: { code: '42P01' } }); render(<MarketingPreferences />);
    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
