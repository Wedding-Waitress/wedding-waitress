import { describe, expect, it } from 'vitest';
import { resolveWelcomeVideoUrl, withWelcomeVideoUrl } from './liveViewMediaConfig';

describe('Welcome Video live-view configuration', () => {
  it('prefers the canonical video_url key', () => {
    expect(resolveWelcomeVideoUrl({ video_url: 'https://cdn.test/new.webm', file_url: 'https://cdn.test/legacy.webm' }))
      .toBe('https://cdn.test/new.webm');
  });

  it('keeps legacy file_url uploads readable', () => {
    expect(resolveWelcomeVideoUrl({ file_url: 'https://cdn.test/legacy.webm' }))
      .toBe('https://cdn.test/legacy.webm');
  });

  it('writes one canonical key without retaining the legacy alias', () => {
    expect(withWelcomeVideoUrl({ file_url: 'https://cdn.test/old.webm', message: 'Welcome' }, 'https://cdn.test/new.webm'))
      .toEqual({ video_url: 'https://cdn.test/new.webm', message: 'Welcome' });
  });
});
