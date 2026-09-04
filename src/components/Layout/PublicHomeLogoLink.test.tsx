import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicHomeLogoLink } from './PublicHomeLogoLink';

const logo = <span>Wedding Waitress test logo</span>;

const renderLogoRouter = (initialEntry: string) => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <div data-testid="homepage"><PublicHomeLogoLink>{logo}</PublicHomeLogoLink></div>,
    },
    {
      path: '/pricing',
      element: <PublicHomeLogoLink>{logo}</PublicHomeLogoLink>,
    },
  ], { initialEntries: [initialEntry] });

  render(<RouterProvider router={router} />);
  return router;
};

describe('public homepage logo navigation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('immediately scrolls to the absolute top when already on the homepage', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    renderLogoRouter('/');
    document.documentElement.scrollTop = 240;
    document.body.scrollTop = 640;

    fireEvent.click(screen.getByRole('link', { name: 'Wedding Waitress home' }));

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it('navigates without a reload and scrolls after the homepage has rendered', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = renderLogoRouter('/pricing');

    fireEvent.click(screen.getByRole('link', { name: 'Wedding Waitress home' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(screen.getByTestId('homepage')).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
    document.body.scrollTop = 500;

    frames.shift()?.(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(document.body.scrollTop).toBe(0);
    frames.shift()?.(0);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('remains a natively keyboard-accessible same-tab link', () => {
    renderLogoRouter('/pricing');
    const link = screen.getByRole('link', { name: 'Wedding Waitress home' });

    link.focus();

    expect(link).toHaveFocus();
    expect(link).toHaveAttribute('href', '/');
    expect(link).not.toHaveAttribute('target');
  });
});
