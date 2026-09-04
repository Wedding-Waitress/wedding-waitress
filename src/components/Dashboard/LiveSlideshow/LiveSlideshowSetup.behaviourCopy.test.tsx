import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/LiveSlideshow/LiveSlideshowSetup.tsx'), 'utf8');

describe('Live Slideshow setup behaviour guidance', () => {
  it('matches the implemented no-auto-clear search behaviour', () => {
    expect(source).toContain('Search results stay visible until they are cleared or a new search is entered');
    expect(source).not.toMatch(/automatically clears searches|clear searches after 30 seconds/i);
  });
});
