import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import managementStyles from './PhotoVideoGallery/photoVideoSharingManagement.module.css';
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

  it('covers the viewport during a Photo & Video Sharing tab transition', () => {
    const { container } = render(
      <DashboardLoadingScreen contained appearance="photo-video-sharing" />,
    );

    expect(container.querySelector('[data-dashboard-loading-screen]')).toHaveClass(
      'fixed',
      'inset-0',
      'min-h-[100dvh]',
      managementStyles.photoVideoSharingSurface,
    );
  });

  it('preserves the original neutral dashboard loading treatments by default', () => {
    const { container, rerender } = render(<DashboardLoadingScreen />);
    const fullScreen = container.querySelector('[data-dashboard-loading-screen]');

    expect(fullScreen).toHaveAttribute('data-loading-appearance', 'neutral');
    expect(fullScreen).toHaveClass('min-h-screen', 'bg-gradient-subtle');
    expect(fullScreen).not.toHaveClass(managementStyles.photoVideoSharingSurface);
    expect(container.querySelector('[data-dashboard-loading-card]')).toHaveClass('ww-box');

    rerender(<DashboardLoadingScreen contained />);
    const containedScreen = container.querySelector('[data-dashboard-loading-screen]');
    expect(containedScreen).toHaveClass('min-h-[60vh]');
    expect(containedScreen).not.toHaveClass(managementStyles.photoVideoSharingSurface);
    expect(screen.getByText('Loading Page...')).toBeInTheDocument();
  });

  it('recognises only the Photo & Video Sharing route namespace and dashboard tab', () => {
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery/digital-guestbook')).toBe('photo-video-sharing');
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery/live-slideshow')).toBe('photo-video-sharing');
    expect(getDashboardLoadingAppearance('/dashboard', '?tab=photo-video-gallery')).toBe('photo-video-sharing');

    expect(getDashboardLoadingAppearance('/dashboard')).toBe('neutral');
    expect(getDashboardLoadingAppearance('/dashboard', '?tab=running-sheet')).toBe('neutral');
    expect(getDashboardLoadingAppearance('/dashboard/upgrade')).toBe('neutral');
    expect(getDashboardLoadingAppearance('/dashboard/photo-video-gallery-old')).toBe('neutral');
  });
});
