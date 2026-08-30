import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PublicMotion } from './PublicMotion';

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PublicMotion', () => {
  it('enhances only a complete public marketing shell', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

    const { container } = render(
      <MemoryRouter initialEntries={['/products']}>
        <PublicMotion />
        <div className="ww-public">
          <header />
          <main><h1 className="ww-display">Products</h1></main>
          <footer />
        </div>
      </MemoryRouter>,
    );

    const root = container.querySelector<HTMLElement>('.ww-public');
    const heading = container.querySelector<HTMLElement>('.ww-display');
    await waitFor(() => expect(root).toHaveAttribute('data-ww-motion', 'enabled'));
    expect(heading).toHaveAttribute('data-ww-reveal', 'visible');
  });

  it('does not touch authenticated-style shells that have no public footer', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <PublicMotion />
        <div className="ww-public">
          <header />
          <main><h1 className="ww-display">Dashboard</h1></main>
        </div>
      </MemoryRouter>,
    );

    await new Promise((resolve) => window.setTimeout(resolve, 30));
    expect(container.querySelector('.ww-public')).not.toHaveAttribute('data-ww-motion');
    expect(container.querySelector('.ww-display')).not.toHaveAttribute('data-ww-reveal');
  });

  it('keeps every reveal visible when reduced motion is requested', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <MemoryRouter>
        <PublicMotion />
        <div className="ww-public">
          <header />
          <main><div className="ww-card">Visible content</div></main>
          <footer />
        </div>
      </MemoryRouter>,
    );

    const root = container.querySelector('.ww-public');
    const card = container.querySelector('.ww-card');
    await waitFor(() => expect(root).toHaveAttribute('data-ww-motion', 'reduced'));
    expect(card).toHaveAttribute('data-ww-reveal', 'visible');
    expect(root).not.toHaveClass('ww-route-enter');
  });
});
