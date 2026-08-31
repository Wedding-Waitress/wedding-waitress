import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({
  gallery: { meta: null as { guest_upload_enabled: boolean } | null, loading: true, error: null as string | null },
}));

vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: () => query.gallery,
}));

import { usePhotoVideoFeatureWorkspace } from './usePhotoVideoFeatureWorkspace';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';

const event = { id: 'event-1', name: "Jason & Linda's Wedding" };

describe('Photo & Video feature workspace selection lifecycle', () => {
  beforeEach(() => {
    query.gallery = { meta: null, loading: true, error: null };
  });

  it('treats initial hydration as loading rather than a genuine empty state', () => {
    const { result } = renderHook(() => usePhotoVideoFeatureWorkspace({
      selectedEventId: event.id, selectedEvent: event, selectionStatus: 'loading',
    }));

    expect(result.current.selectionStatus).toBe('loading');
    expect(result.current.selectedEventId).toBe(event.id);
  });

  it('preserves the event and enabled metadata during route revalidation and a rapid remount', () => {
    query.gallery = { meta: { guest_upload_enabled: true }, loading: false, error: null };

    const selection = { selectedEventId: event.id, selectedEvent: event, selectionStatus: 'selected' as const };
    const first = renderHook(() => usePhotoVideoFeatureWorkspace(selection));
    expect(first.result.current.selectedEvent?.name).toBe(event.name);
    first.unmount();

    query.gallery = { meta: { guest_upload_enabled: true }, loading: true, error: null };
    const next = renderHook(() => usePhotoVideoFeatureWorkspace(selection));

    expect(next.result.current.selectionStatus).toBe('selected');
    expect(next.result.current.selectedEvent?.name).toBe(event.name);
    expect(next.result.current.meta?.guest_upload_enabled).toBe(true);
  });

  it('shows a genuine empty state only after event loading has completed', () => {
    query.gallery = { meta: null, loading: false, error: null };
    const { result } = renderHook(() => usePhotoVideoFeatureWorkspace({
      selectedEventId: null, selectedEvent: null, selectionStatus: 'empty',
    }));
    expect(result.current.selectionStatus).toBe('empty');
    expect(result.current.selectedEventId).toBeNull();
  });

  it('never renders Off or the disabled notice while the workspace is loading', () => {
    render(
      <FeatureWorkspaceLayout
        title="Digital Photo Booth"
        description="Description"
        eventName={event.name}
        enabled={false}
        selectionStatus="loading"
        onToggle={vi.fn()}
        onBack={vi.fn()}
        disabledNotice="This feature is currently turned off."
      />,
    );

    expect(screen.getByText(event.name)).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Off')).not.toBeInTheDocument();
    expect(screen.queryByText('This feature is currently turned off.')).not.toBeInTheDocument();
  });
});
