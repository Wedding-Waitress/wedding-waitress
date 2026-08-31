import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (fileName: string) => fs.readFileSync(
  path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery', fileName),
  'utf8',
);

describe('Photo & Video Sharing landing-page typography', () => {
  it('keeps the approved heading and description hierarchy breakpoint-invariant', () => {
    const page = readSource('PhotoVideoGalleryPage.tsx');
    const features = readSource('GalleryGuestFeaturesCard.tsx');
    const css = readSource('PhotoVideoGalleryLanding.module.css');

    expect(page).toContain("const MANROPE_FONT = \"'Manrope', ui-sans-serif, system-ui, sans-serif\"");
    expect(page).toContain('styles.headingCopy');
    expect(features).toContain('styles.featuresHeading');
    expect(features).toContain('styles.featureCopy');
    expect(css).toContain('font-size: 24px');
    expect(css).toContain('font-size: 20px');
    expect(css).toContain('font-size: 13px');
    expect(css).toContain('line-height: 18px');
    expect(features).not.toContain('sm:text-[17px]');
    expect(features).not.toContain("tracking-[-0.012em]");
  });
});
