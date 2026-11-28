import React, { useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGuestSearchResultReveal } from './useGuestSearchResultReveal';

const scroll = vi.fn();
let inputTop = 400, resultBottom = 750;
function Harness({ query = '', match = 'guest' }: { query?: string; match?: string }) {
  const input = useRef<HTMLInputElement>(null), results = useRef<HTMLDivElement>(null);
  useGuestSearchResultReveal(input, results, query, match || undefined, true);
  return <><input ref={input} /><div ref={results}>{match && <button data-guest-search-result>Guest</button>}</div></>;
}
beforeEach(() => {
  vi.useFakeTimers();scroll.mockReset();inputTop = 400;resultBottom = 750;
  vi.spyOn(window, 'scrollBy').mockImplementation(scroll);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    return { top: this.tagName === 'INPUT' ? inputTop : resultBottom - 48, bottom: this.tagName === 'INPUT' ? inputTop + 52 : resultBottom } as DOMRect;
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
});
afterEach(() => { cleanup();vi.restoreAllMocks();vi.useRealTimers(); });
function settle() { act(() => { vi.advanceTimersByTime(250); }); }
it('does not move the initial page or an empty/no-match search', () => {
  const view = render(<Harness />);view.container.querySelector('input')!.focus();settle();expect(scroll).not.toHaveBeenCalled();
  view.rerender(<Harness query="absent" match="" />);settle();expect(scroll).not.toHaveBeenCalled();
});
it('reveals only the needed distance once per search while preserving focus', () => {
  const view = render(<Harness />), input = view.container.querySelector('input')!;input.focus();
  view.rerender(<Harness query="amb" />);settle();
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 162, behavior: 'smooth' });expect(document.activeElement).toBe(input);
  view.rerender(<Harness query="amber" />);settle();expect(scroll).toHaveBeenCalledTimes(1);
  view.rerender(<Harness query="" />);view.rerender(<Harness query="other" />);settle();expect(scroll).toHaveBeenCalledTimes(2);
});
it('leaves already visible results in place', () => {
  resultBottom = 500;
  const view = render(<Harness />);view.container.querySelector('input')!.focus();view.rerender(<Harness query="amb" />);settle();expect(scroll).not.toHaveBeenCalled();
});
it('cancels the reveal when the user scrolls manually', () => {
  const view = render(<Harness />);view.container.querySelector('input')!.focus();view.rerender(<Harness query="amb" />);
  fireEvent.wheel(window);settle();view.rerender(<Harness query="amber" />);settle();expect(scroll).not.toHaveBeenCalled();
});
it('respects reduced motion and leaves the input visible above the keyboard', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const viewport = Object.assign(new EventTarget(), { height: 400, offsetTop: 0 });
  vi.stubGlobal('visualViewport', viewport);
  try {
    const view = render(<Harness />);view.container.querySelector('input')!.focus();view.rerender(<Harness query="amb" />);settle();
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 362, behavior: 'auto' });expect(inputTop - 362).toBeGreaterThanOrEqual(12);
  } finally { vi.unstubAllGlobals(); }
});
it('does not scroll if focus has moved elsewhere', () => {
  const view = render(<Harness query="amb" />);settle();expect(scroll).not.toHaveBeenCalled();
});
