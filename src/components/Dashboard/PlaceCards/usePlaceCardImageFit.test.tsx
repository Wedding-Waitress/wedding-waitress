import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { placeCardImagePaper, usePlaceCardImageFit } from './usePlaceCardImageFit';
import { normalizePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
const m = vi.hoisted(() => ({ confirmFit: vi.fn(), rememberFit: vi.fn() }));
vi.mock('../Signage/useSignageImageFit', () => ({ useSignageImageFit: () => ({ ...m, dialog: null }) }));
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); m.confirmFit.mockResolvedValue(true); });
describe('Place Cards crop approval', () => {
  it.each([['full',105,99],['full_front',105,49.5],['full_back',105,49.5]])('uses correct dimensions for %s', (type,widthMm,heightMm) => {
    expect(placeCardImagePaper(type)).toMatchObject({widthMm,heightMm});
  });
  it('keeps decorative images uncropped', () => expect(placeCardImagePaper('decorative')).toBeNull());
  it('does not save a rejected library image', async () => {
    const save=vi.fn(); m.confirmFit.mockResolvedValue(false);
    const settings=normalizePlaceCardSettings({background_image_type:'full_front'},'test');
    const {result}=renderHook(()=>usePlaceCardImageFit(settings,save));
    let saved; await act(async()=>{saved=await result.current.updateSettings({background_image_url:'/new.png'})});
    expect(saved).toBe(false);expect(save).not.toHaveBeenCalled();
    expect(result.current.backgroundFit).toBe('contain');
  });
  it('leaves the existing mode unchanged if its new crop is cancelled', async () => {
    const save=vi.fn(); const settings=normalizePlaceCardSettings({background_image_type:'full_front',background_image_url:'/existing.png'},'test');
    const {result}=renderHook(()=>usePlaceCardImageFit(settings,save));
    await waitFor(()=>expect(result.current.backgroundFit).toBe('cover'));
    m.confirmFit.mockResolvedValue(false);
    await act(async()=>{await result.current.updateSettings({background_image_type:'full'})});
    expect(save).not.toHaveBeenCalled();expect(result.current.backgroundFit).toBe('cover');
  });
  it('saves approved artwork with centered positioning', async()=>{
    const save=vi.fn().mockResolvedValue(true);const settings=normalizePlaceCardSettings({background_image_type:'full_front'},'test');
    const {result}=renderHook(()=>usePlaceCardImageFit(settings,save));
    await act(async()=>{expect(await result.current.updateSettings({background_image_url:'/new.png'})).toBe(true)});
    expect(save).toHaveBeenCalledWith({background_image_url:'/new.png',background_image_x_position:50,background_image_y_position:50});
  });
  it.each([true, false])('remembers the %s decision after remount and export', async (approved) => {
    m.confirmFit.mockResolvedValue(approved);
    const settings=normalizePlaceCardSettings({background_image_type:'full_front',background_image_url:'/existing.png'},'test');
    const save=vi.fn();
    const first=renderHook(()=>usePlaceCardImageFit(settings,save));
    await act(async()=>{});
    first.unmount();
    const second=renderHook(()=>usePlaceCardImageFit({...settings},save));
    await act(async()=>{});
    expect(second.result.current.backgroundFit).toBe(approved ? 'cover' : 'contain');
    await act(async()=>{expect(await second.result.current.ensureFit()).toBe(true)});
    expect(m.confirmFit).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    m.confirmFit.mockResolvedValue(false);
    await act(async()=>{await second.result.current.updateSettings({background_image_url:'/different.png'})});
    expect(m.confirmFit).toHaveBeenCalledTimes(2);
    expect(save).not.toHaveBeenCalled();
  });

});

it.each([true, false])('retains the %s crop decision in a new browser session', async (approved) => {
  m.confirmFit.mockResolvedValue(approved);
  const settings = normalizePlaceCardSettings({ background_image_type: 'full_front', background_image_url: '/saved.png' }, 'persistent-event');
  const save = vi.fn();
  const first = renderHook(() => usePlaceCardImageFit(settings, save));
  await act(async () => {});
  first.unmount();
  sessionStorage.clear(); // A separately opened tab has no prior session decisions.
  const reopened = renderHook(() => usePlaceCardImageFit({ ...settings }, save));
  await act(async () => {});
  expect(m.confirmFit).toHaveBeenCalledTimes(1);
  expect(reopened.result.current.backgroundFit).toBe(approved ? 'cover' : 'contain');
  expect(save).not.toHaveBeenCalled();
});
it('migrates an earlier tab-only approval without another prompt', async () => {
  const settings = normalizePlaceCardSettings({ background_image_type: 'full_front', background_image_url: '/legacy.png' }, 'legacy-event');
  const key = 'ww:place-card-image-fit:legacy-event|/legacy.png|full_front|50|50';
  sessionStorage.setItem(key, 'cover');
  const hook = renderHook(() => usePlaceCardImageFit(settings, vi.fn()));
  await act(async () => {});
  expect(hook.result.current.backgroundFit).toBe('cover');
  expect(localStorage.getItem(key)).toBe('cover');
  expect(m.confirmFit).not.toHaveBeenCalled();
});

it('keeps the tab-only fallback when persistent storage is unavailable', async () => {
  const settings = normalizePlaceCardSettings({ background_image_type: 'full_front', background_image_url: '/fallback.png' }, 'fallback-event');
  const key = 'ww:place-card-image-fit:fallback-event|/fallback.png|full_front|50|50';
  sessionStorage.setItem(key, 'cover');
  const access = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Storage unavailable'); });
  try {
    const hook = renderHook(() => usePlaceCardImageFit(settings, vi.fn()));
    await act(async () => {});
    expect(hook.result.current.backgroundFit).toBe('cover');
    expect(m.confirmFit).not.toHaveBeenCalled();
  } finally { access.mockRestore(); }
});