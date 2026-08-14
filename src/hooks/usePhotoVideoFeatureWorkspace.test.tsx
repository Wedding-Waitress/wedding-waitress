import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({
  events: [] as Array<{ id: string; name: string }>,
  loading: true,
  loaded: false,
  gallery: { meta: null as { guest_upload_enabled: boolean } | null, loading: true, error: null as string | null },
}));

vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({ events: query.events, loading: query.loading, loaded: query.loaded }),
}));
vi.mock('@/hooks/useEventMediaGallery', () => ({
  useEventMediaGallery: () => query.gallery,
}));

import { setSelectedEventId } from '@/hooks/useSelectedEvent';
import { usePhotoVideoFeatureWorkspace } from './usePhotoVideoFeatureWorkspace';
import { FeatureWorkspaceLayout } from '@/components/Dashboard/PhotoVideoGallery/FeatureWorkspace/FeatureWorkspaceLayout';

const event = { id: 'event-1', name: "Jason & Linda's Wedding" };

describe('Photo & Video feature workspace selection lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    setSelectedEventId(null);
    query.events = [];
    query.loading = true;
    query.loaded = false;
    query.gallery = { meta: null, loading: true, error: null };
  });

  it('treats initial hydration as loading rather than a genuine empty state', () => {
    setSelectedEventId(event.id);
    const { result } = renderHook(() => usePhotoVideoFeatureWorkspace());

    expect(result.current.selectionStatus).toBe('loading');
    expect(result.current.selectedEventId).toBe(event.id);
    expect(localStorage.getItem('ww:selected_event_id')).toBe(event.id);
  });

  it('preserves the event and enabled metadata during route revalidation and a rapid remount', () => {
    setSelectedEventId(event.id);
    query.events = [event];
    query.loading = false;
    query.loaded = true;
    query.gallery = { meta: { guest_upload_enabled: true }, loading: false, error: null };

    const first = renderHook(() => usePhotoVideoFeatureWorkspace());
    expect(first.result.current.selectedEvent?.name).toBe(event.name);
    first.unmount();

    query.events = [];
    query.loading = true;
    query.loaded = true;
    query.gallery = { meta: { guest_upload_enabled: true }, loading: true, error: null };
    const next = renderHook(() => usePhotoVideoFeatureWorkspace());

    expect(next.result.current.selectionStatus).toBe('selected');
    expect(next.result.current.selectedEvent?.name).toBe(event.name);
    expect(next.result.current.meta?.guest_upload_enabled).toBe(true);
    expect(localStorage.getItem('ww:selected_event_id')).toBe(event.id);
  });

  it('shows a genuine empty state only after event loading has completed', async () => {
    setSelectedEventId(event.id);
    const { result, rerender } = renderHook(() => usePhotoVideoFeatureWorkspace());
    expect(result.current.selectionStatus).toBe('loading');

    query.loading = false;
    query.loaded = true;
    rerender();
    await act(async () => { await Promise.resolve(); });

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
