import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }) }) } }));
import { linkSavedCeremonyPlan } from './ceremonyFloorPlanLink';
beforeEach(() => vi.clearAllMocks());
describe('linking saved ceremony plans', () => {
  it('keeps uploaded content when no saved plan exists', async () => {
    mocks.lookup.mockResolvedValue({ data: null, error: null }); const save = vi.fn();
    await expect(linkSavedCeremonyPlan('event', { source: 'upload', file_url: 'existing-image' }, save)).rejects.toThrow('Create and save');
    expect(save).not.toHaveBeenCalled();
  });
  it('does not publish a link when the lookup fails', async () => {
    mocks.lookup.mockResolvedValue({ data: null, error: new Error('offline') }); const save = vi.fn();
    await expect(linkSavedCeremonyPlan('event', {}, save)).rejects.toThrow('offline'); expect(save).not.toHaveBeenCalled();
  });
  it('preserves the uploaded file for switching back after linking a saved plan', async () => {
    mocks.lookup.mockResolvedValue({ data: { id: 'saved-plan' }, error: null }); const save = vi.fn().mockResolvedValue(undefined);
    await linkSavedCeremonyPlan('event', { source: 'upload', file_url: 'existing-image' }, save);
    expect(save).toHaveBeenCalledWith({ source: 'existing', file_url: 'existing-image' });
  });
  it('propagates a failed configuration save', async () => {
    mocks.lookup.mockResolvedValue({ data: { id: 'saved-plan' }, error: null });
    await expect(linkSavedCeremonyPlan('event', {}, vi.fn().mockRejectedValue(new Error('save rejected')))).rejects.toThrow('save rejected');
  });
});
