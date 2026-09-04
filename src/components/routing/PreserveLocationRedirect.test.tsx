import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  LegacyLiveSlideshowViewRedirect,
  PreserveLocationRedirect,
} from './PreserveLocationRedirect';

const LocationProbe = () => {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}${location.hash}`}</output>;
};

describe('Live Slideshow legacy route redirects', () => {
  it('preserves query parameters and the hash for marketing aliases', async () => {
    render(
      <MemoryRouter initialEntries={['/kiosk-live-view?utm_source=invite#details']}>
        <Routes>
          <Route path="/kiosk-live-view" element={<PreserveLocationRedirect to="/live-slideshow" />} />
          <Route path="/live-slideshow" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('/live-slideshow?utm_source=invite#details')).toBeInTheDocument();
  });

  it('preserves the event slug and query parameters for public guest links', async () => {
    render(
      <MemoryRouter initialEntries={['/kiosk/smith-and-jones?table=12#lookup']}>
        <Routes>
          <Route path="/kiosk/:eventSlug" element={<LegacyLiveSlideshowViewRedirect />} />
          <Route path="/live-slideshow/:eventSlug" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('/live-slideshow/smith-and-jones?table=12#lookup')).toBeInTheDocument();
  });
});
