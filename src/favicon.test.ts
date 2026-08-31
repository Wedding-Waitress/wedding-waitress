import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pngSize = (path: string) => {
  const png = readFileSync(path);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

describe('shared application favicon', () => {
  it('declares one cache-busted shared favicon set', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain('href="/favicon.ico?v=5" sizes="any"');
    expect(html).toContain('sizes="16x16" href="/favicon-16.png?v=5"');
    expect(html).toContain('sizes="32x32" href="/favicon-32.png?v=5"');
    expect(html).toContain('sizes="192x192" href="/favicon-192.png?v=5"');
    expect(html).toContain('sizes="180x180" href="/favicon-180.png?v=5"');
    expect(html.match(/rel="icon"/g)).toHaveLength(4);
    expect(html.match(/rel="apple-touch-icon"/g)).toHaveLength(1);
  });

  it('keeps the existing manifest settings while using the new shared icons', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));

    expect(manifest.icons).toEqual([
      { src: '/favicon-192.png?v=5', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon-512.png?v=5', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ]);
    expect(manifest.name).toBe('Wedding Waitress - Seating Management');
    expect(manifest.theme_color).toBe('#967A59');
    expect(manifest.background_color).toBe('#FAF8F5');
  });

  it.each([
    ['public/favicon-16.png', 16],
    ['public/favicon-32.png', 32],
    ['public/favicon-180.png', 180],
    ['public/favicon-192.png', 192],
    ['public/favicon-512.png', 512],
  ])('provides %s at its declared square dimensions', (path, size) => {
    expect(pngSize(path)).toEqual([size, size]);
  });

  it('provides a multi-size ICO containing 16, 32 and 48 pixel images', () => {
    const ico = readFileSync('public/favicon.ico');
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
    expect([ico[7], ico[23], ico[39]]).toEqual([16, 32, 48]);
  });
});
