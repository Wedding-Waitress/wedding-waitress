import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('QR Code Seating Chart typography contract', () => {
  const page = read('src/components/Dashboard/QRCode/QRCodeSeatingChart.tsx');
  const card = read('src/components/Dashboard/QRCode/QRCodeMainCard.tsx');
  const dashboardCss = read('src/components/Dashboard/QRCode/QRCodeSeatingChart.module.css');
  const publicPage = read('src/pages/GuestLookup.tsx');
  const publicCss = read('src/pages/GuestLookup.module.css');
  const qrGenerator = read('src/lib/advancedQRGenerator.ts');
  const urlUtils = read('src/lib/urlUtils.ts');

  it('defines the requested dashboard heading hierarchy', () => {
    expect(dashboardCss).toMatch(/\.eventPanel[^\n]*text-2xl[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(dashboardCss).toMatch(/\.generatorPanel[^\n]*text-2xl[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(dashboardCss).toMatch(/\.designerHeading h3[^{]*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
  });

  it('defines labels, ordinary content, buttons, and status typography', () => {
    expect(dashboardCss).toMatch(/:is\(label, strong\)[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(dashboardCss).toMatch(/\.eventDetailsText[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(dashboardCss).toMatch(/\.statusLabel[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(dashboardCss).toContain('button:not([role="switch"])');
  });

  it('covers every dashboard configuration and public guest workflow', () => {
    for (const label of ['Color', 'Shape & Form', 'Logo', 'RSVP Invite', 'Welcome Video', 'Ceremony Floor Plan', 'Reception Floor Plan', 'Menu', 'Add Your Photo or Logo', 'Guest Song Requests']) {
      expect(card).toContain(label);
    }
    for (const label of ['RSVP Invite', 'Welcome Video', 'Ceremony Floor Plan', 'Reception Floor Plan', 'Menu', 'Update & Confirm Your Details']) {
      expect(publicPage).toContain(label);
    }
    expect(publicCss).toContain('public Guest Live View');
    expect(publicCss).toMatch(/\.page h1,[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(publicCss).toMatch(/ww-public-live-dialog[^\n]*:is\(h1, h2, h3, h4\)[^{]*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
  });

  it('keeps QR generation, image export, and public-link construction outside the typography change', () => {
    expect(page).toContain('QRCodeMainCard');
    expect(card).toContain("id=\"qr-preview\"");
    expect(card).toContain('AdvancedQRGenerator');
    expect(card).toContain('handleDownloadPNG');
    expect(card).toContain('handleDownloadJPG');
    expect(qrGenerator).toContain('export class AdvancedQRGenerator');
    expect(urlUtils).toContain('export function buildGuestLookupUrl');
  });
});
