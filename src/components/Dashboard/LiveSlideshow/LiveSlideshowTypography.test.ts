import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Live Slideshow typography', () => {
  const setupCss = read('src/components/Dashboard/LiveSlideshow/LiveSlideshowSetup.module.css');
  const publicLiveSlideshowCss = read('src/pages/LiveSlideshowView.module.css');
  const guestLiveCss = read('src/pages/GuestLookup.module.css');

  it('keeps the dashboard hierarchy scoped to the Live Slideshow setup page', () => {
    expect(setupCss).toMatch(/\.page \.mainHeading,[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 700 !important;[\s\S]*overflow-wrap: anywhere;/);
    expect(setupCss).toMatch(/\.page :is\(h3, h4\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 700 !important;/);
    expect(setupCss).toMatch(/\.page :is\(label, strong\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;[\s\S]*line-height: 18px !important;/);
    expect(setupCss).toMatch(/\.page :is\(button, \[role="button"\]\):not\(\[role="switch"\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
  });

  it('applies the public Live Slideshow hierarchy without changing compact status badges', () => {
    expect(publicLiveSlideshowCss).toMatch(/\.page h1[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;/);
    expect(publicLiveSlideshowCss).toMatch(/\.page :is\(h2, h3\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(publicLiveSlideshowCss).toMatch(/\.page :is\(p, \[data-live-slideshow-body\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(publicLiveSlideshowCss).toContain('[data-live-slideshow-status]');
    expect(read('src/components/LiveSlideshow/LiveSlideshowGuestCard.tsx')).toContain('data-live-slideshow-status');
  });

  it('covers guest search, result, form, modal, and menu typography', () => {
    expect(guestLiveCss).toMatch(/\.page h1,[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;[\s\S]*overflow-wrap: anywhere;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(h1, h2, h3, h4\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(p, li, \[data-live-body\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(label, strong, \[data-live-label\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
    expect(guestLiveCss).toContain(':global(.ww-public-live-menu) [role="option"]');
  });
});
