import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import managementStyles from './PhotoVideoGallery/photoVideoSharingManagement.module.css';
import coreStyles from './DashboardLoadingScreen.module.css';
import {
  DashboardLoadingScreen,
  getDashboardLoadingAppearance,
} from './DashboardLoadingScreen';

describe('DashboardLoadingScreen', () => {
  it('uses the shared chocolate surface and solid-white title only when requested', () => {
    const { container } = render(<DashboardLoadingScreen appearance="photo-video-sharing" />);
    const screenSurface = container.querySelector('[data-dashboard-loading-screen]');
    const card = container.querySelector('[data-dashboard-loading-card]');
    const spinner = card?.querySelector('svg');

    expect(screenSurface).toHaveAttribute('data-loading-appearance', 'photo-video-sharing');
    expect(screenSurface).toHaveClass(
      'min-h-[100dvh]',
      'overflow-x-hidden',
      managementStyles.photoVideoSharingSurface,
    );
    expect(card).toHaveClass(
      'max-w-xs',
      'rounded-2xl',
      managementStyles.glassCard,
      managementStyles.loadingGlassPanel,
    );
    expect(screen.getByText('Loading Dashboard')).toHaveClass(
      'text-white',
      managementStyles.loadingGlassTitle,
    );
    expect(spinner).toHaveClass(
      'h-6',
      'w-6',
      'motion-safe:animate-spin',
      'motion-reduce:animate-none',
      managementStyles.loadingGlassSpinner,
    );
  });

  it('keeps Photo & Video Sharing tab transitions inside the content region', () => {
    const { container } = render(
      <DashboardLoadingScreen contained appearance="photo-video-sharing" />,
    );

    expect(container.querySelector('[data-dashboard-loading-screen]')).toHaveClass(
      'relative',
      'min-h-[60vh]',
      managementStyles.photoVideoSharingSurface,
    );
    expect(container.querySelector('[data-dashboard-loading-screen]')).not.toHaveClass('fixed', 'inset-0');
  });

  it('preserves the original neutral dashboard loading treatments by default', () => {
    const { container, rerender } = render(<DashboardLoadingScreen />);
    const fullScreen = container.querySelector('[data-dashboard-loading-screen]');

    expect(fullScreen).toHaveAttribute('data-loading-appearance', 'neutral');
    expect(fullScreen).toHaveClass('min-h-screen', 'ww-application-background');
    expect(fullScreen).not.toHaveClass(managementStyles.photoVideoSharingSurface);
    expect(container.querySelector('[data-dashboard-loading-card]')).toHaveClass('ww-box');

    rerender(<DashboardLoadingScreen contained />);
    const containedScreen = container.querySelector('[data-dashboard-loading-screen]');
    expect(containedScreen).toHaveClass('min-h-[60vh]');
    expect(containedScreen).not.toHaveClass(managementStyles.photoVideoSharingSurface);
    expect(screen.getByText('Loading Page...')).toBeInTheDocument();
  });

  it('uses the approved mocha and espresso glass treatment for core dashboard pages', () => {
    const { container } = render(<DashboardLoadingScreen appearance="core" />);
    const screenSurface = container.querySelector('[data-dashboard-loading-screen]');
    const card = container.querySelector('[data-dashboard-loading-card]');

    expect(screenSurface).toHaveAttribute('data-loading-appearance', 'core');
    expect(screenSurface).toHaveClass('min-h-[100dvh]', coreStyles.coreSurface);
    expect(card).toHaveClass(
      'max-w-xs',
      'rounded-2xl',
      'p-6',
      'sm:p-7',
      managementStyles.glassCard,
      managementStyles.loadingGlassPanel,
    );
    expect(card?.querySelector('svg')).toHaveClass(
      'h-6',
      'w-6',
      'mb-3',
      managementStyles.loadingGlassSpinner,
    );
    expect(screen.getByText('Loading Dashboard...')).toHaveClass(
      'text-lg',
      'font-medium',
      'text-white',
      managementStyles.loadingGlassTitle,
    );
    expect(screen.getByText('Please wait while we set up your workspace')).toHaveClass('mt-1', 'text-sm');
  });

  it('keeps the core loading surface inside the content region for tab transitions', () => {
    const { container } = render(<DashboardLoadingScreen contained appearance="core" />);

    expect(container.querySelector('[data-dashboard-loading-screen]')).toHaveClass(
      'relative',
      'min-h-[60vh]',
      coreStyles.coreSurface,
    );
    expect(container.querySelector('[data-dashboard-loading-screen]')).not.toHaveClass('fixed', 'inset-0');
    expect(container.querySelector('[data-dashboard-loading-card]')).toHaveClass(
      'max-w-xs',
      managementStyles.glassCard,
      managementStyles.loadingGlassPanel,
    );
    expect(screen.getByText('Loading Page...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we set up your workspace')).toBeInTheDocument();
  });

  it('recognises only the Photo & Video Sharing route namespace and dashboard tab', () => {
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery/digital-guestbook')).toBe('photo-video-sharing');
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery/live-slideshow')).toBe('photo-video-sharing');
    expect(getDashboardLoadingAppearance('/dashboard', '?tab=photo-video-gallery')).toBe('photo-video-sharing');

    expect(getDashboardLoadingAppearance('/dashboard')).toBe('core');
    expect(getDashboardLoadingAppearance('/dashboard', '?tab=running-sheet')).toBe('core');
    expect(getDashboardLoadingAppearance('/dashboard/upgrade')).toBe('neutral');
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery-old')).toBe('neutral');
  });

  it.each([
    'dashboard',
    'my-events',
    'table-list',
    'guest-list',
    'qr-code',
    'signage',
    'invitations',
    'place-cards',
    'individual-table-chart',
    'floor-plan',
    'dietary-chart',
    'full-seating-chart',
    'live-slideshow',
    'dj-mc-questionnaire',
    'running-sheet',
  ])('maps the %s tab to the core loading theme', (tab) => {
    expect(getDashboardLoadingAppearance('/dashboard', `?tab=${tab}`)).toBe('core');
  });
});
