import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({
  meta: {
    gallery_id: 'gallery-1',
    event_id: 'event-1',
    is_open: true,
    photo_booth_strip_template_url: null as string | null,
    photo_booth_strip_style: null as Record<string, unknown> | null,
  },
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: backend.rpc,
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
    }),
    removeChannel: vi.fn(),
    storage: {
      from: () => ({
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  },
}));

import { clearAllCaches } from '@/lib/cacheRegistry';
import { useEventMediaGallery } from './useEventMediaGallery';

describe('useEventMediaGallery Photo Booth template persistence', () => {
  beforeEach(() => {
    clearAllCaches();
    backend.meta.photo_booth_strip_template_url = null;
    backend.meta.photo_booth_strip_style = null;
    backend.rpc.mockReset();
    backend.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_event_media_gallery_host') {
        return { data: [{ ...backend.meta }], error: null };
      }
      if (name === 'get_event_media_items_host') return { data: [], error: null };
      if (name === 'update_event_media_photo_booth_template') {
        backend.meta.photo_booth_strip_template_url = args._template_url as string | null;
        backend.meta.photo_booth_strip_style = args._style as Record<string, unknown>;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });
  });

  it('preserves an organiser-owned custom template and refetches the canonical event settings after saving', async () => {
    const hook = renderHook(() => useEventMediaGallery('event-1'));
    await waitFor(() => expect(hook.result.current.meta?.gallery_id).toBe('gallery-1'));

    const settings = {
      bottom_text: 'Jason & Linda',
      logo_url: null,
      template_url: 'https://storage.test/event/custom-template.jpg',
      style: {
        backgroundMode: 'template' as const,
        templateId: null,
        bgColor: '#967A59',
        textBackdrop: 'black' as const,
      },
    };

    await act(async () => {
      await hook.result.current.updatePhotoBoothTemplate('strip', settings);
    });

    expect(backend.rpc).toHaveBeenCalledWith('update_event_media_photo_booth_template', {
      _event_id: 'event-1',
      _kind: 'strip',
      _bottom_text: settings.bottom_text,
      _logo_url: null,
      _template_url: settings.template_url,
      _style: settings.style,
    });
    expect(backend.rpc.mock.calls.filter(([name]) => name === 'get_event_media_gallery_host')).toHaveLength(2);
    expect(hook.result.current.meta).toMatchObject({
      photo_booth_strip_template_url: settings.template_url,
      photo_booth_strip_style: {
        backgroundMode: 'template',
        templateId: null,
        textBackdrop: 'black',
      },
    });

    hook.unmount();
  });
});
