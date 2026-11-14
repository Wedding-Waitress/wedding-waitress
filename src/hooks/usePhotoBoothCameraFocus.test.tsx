import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePhotoBoothCameraFocus } from './usePhotoBoothCameraFocus';

let camera: HTMLDivElement;
let viewport: EventTarget & { height: number; offsetTop: number };
let scroll: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  camera = document.createElement('div'); document.body.appendChild(camera);
  vi.spyOn(camera, 'getBoundingClientRect').mockReturnValue({ top: 600, height: 400 } as DOMRect);
  viewport = Object.assign(new EventTarget(), { height: 400, offsetTop: 120 });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerWidth', 390); vi.stubGlobal('scrollY', 200);
  scroll = vi.fn(); vi.stubGlobal('scrollTo', scroll);
});
afterEach(() => { cleanup(); camera.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
it('waits for keyboard viewport settling, centres the camera once, and then releases viewport tracking', () => {
  const {result} = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => result.current()); tick(300);
  viewport.height = 800; viewport.offsetTop = 0; viewport.dispatchEvent(new Event('resize'));
  tick(199); expect(scroll).not.toHaveBeenCalled(); tick(1);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 600, behavior: 'smooth' });
  viewport.dispatchEvent(new Event('resize')); tick(2000);
  expect(scroll).toHaveBeenCalledTimes(1);
});
it('coalesces blur and Start and respects reduced motion', () => {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({matches: query.includes('reduced-motion')} as MediaQueryList));
  const {result} = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => { result.current(); result.current(); }); tick(2000);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({top: 680, behavior: 'instant'});
});
it.each(['touchmove', 'wheel', 'pointerdown', 'focusin'])('lets manual %s cancel a pending automatic scroll', event => {
  const {result} = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => result.current()); window.dispatchEvent(new Event(event)); tick(2000);
  expect(scroll).not.toHaveBeenCalled();
});
it('cleans up on unmount and leaves non-touch desktop editing alone', () => {
  const view = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => view.result.current()); view.unmount(); tick(2000); expect(scroll).not.toHaveBeenCalled();
  vi.stubGlobal('innerWidth', 1440); vi.stubGlobal('navigator', {maxTouchPoints: 0});
  const desktop = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => desktop.result.current()); tick(2000); expect(scroll).not.toHaveBeenCalled();
});
it('uses the layout viewport when VisualViewport is unavailable', () => {
  vi.stubGlobal('visualViewport', undefined); vi.stubGlobal('innerHeight', 800);
  const {result} = renderHook(() => usePhotoBoothCameraFocus({current: camera}));
  act(() => result.current()); tick(350);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({top: 600, behavior: 'smooth'});
});

it('centres within the actual overflowing ancestor instead of scrolling an inactive window', () => {
  const container=document.createElement('div');document.body.appendChild(container);container.appendChild(camera);
  container.style.overflowY='auto';
  Object.defineProperty(container,'scrollHeight',{value:2000});Object.defineProperty(container,'clientHeight',{value:700});
  vi.spyOn(container,'getBoundingClientRect').mockReturnValue({top:100,bottom:800} as DOMRect);
  container.scrollTop=200;const nestedScroll=vi.fn();container.scrollTo=nestedScroll;
  viewport.height=800;viewport.offsetTop=0;
  const {result,unmount}=renderHook(()=>usePhotoBoothCameraFocus({current:camera}));
  act(()=>result.current());tick(350);
  expect(nestedScroll).toHaveBeenCalledExactlyOnceWith({top:550,behavior:'smooth'});expect(scroll).not.toHaveBeenCalled();
  unmount();container.remove();
});
