import { describe, expect, it } from 'vitest';
import { buildLiveSlideshowUrl } from './urlUtils';

describe('buildLiveSlideshowUrl', () => {
  it('builds the canonical public route and safely encodes the event slug', () => {
    expect(buildLiveSlideshowUrl('smith & jones')).toMatch(/\/live-slideshow\/smith%20%26%20jones$/);
    expect(buildLiveSlideshowUrl('smith & jones')).not.toContain('/kiosk/');
  });
});
