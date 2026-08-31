import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Kiosk Live View typography', () => {
  const setupCss = read('src/components/Dashboard/Kiosk/KioskSetup.module.css');
  const publicKioskCss = read('src/pages/KioskView.module.css');
  const guestLiveCss = read('src/pages/GuestLookup.module.css');

  it('keeps the dashboard hierarchy scoped to the Kiosk setup page', () => {
    expect(setupCss).toMatch(/\.page \.mainHeading,[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 700 !important;[\s\S]*overflow-wrap: anywhere;/);
    expect(setupCss).toMatch(/\.page :is\(h3, h4\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 700 !important;/);
    expect(setupCss).toMatch(/\.page :is\(label, strong\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;[\s\S]*line-height: 18px !important;/);
    expect(setupCss).toMatch(/\.page :is\(button, \[role="button"\]\):not\(\[role="switch"\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
  });

  it('applies the public kiosk hierarchy without changing compact status badges', () => {
    expect(publicKioskCss).toMatch(/\.page h1[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;/);
    expect(publicKioskCss).toMatch(/\.page :is\(h2, h3\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(publicKioskCss).toMatch(/\.page :is\(p, \[data-kiosk-body\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(publicKioskCss).toContain('[data-kiosk-status]');
    expect(read('src/components/Kiosk/KioskGuestCard.tsx')).toContain('data-kiosk-status');
  });

  it('covers guest search, result, form, modal, and menu typography', () => {
    expect(guestLiveCss).toMatch(/\.page h1,[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;[\s\S]*overflow-wrap: anywhere;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(h1, h2, h3, h4\)[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(p, li, \[data-live-body\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(guestLiveCss).toMatch(/:global\(\.ww-public-live-dialog\) :is\(label, strong, \[data-live-label\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
    expect(guestLiveCss).toContain(':global(.ww-public-live-menu) [role="option"]');
  });
});
