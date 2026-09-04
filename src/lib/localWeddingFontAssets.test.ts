import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGoogleFont } from './googleFonts';
import { LOCAL_WEDDING_FONTS } from './localWeddingFonts';

const ROOT = process.cwd();
const FONT_ROOT = join(ROOT, 'public', 'fonts');
const CSS = readFileSync(join(ROOT, 'src', 'styles', 'localWeddingFonts.css'), 'utf8');

const families = [
  { dir: 'alex-brush', files: ['alex-brush-latin.woff2', 'alex-brush-latin-ext.woff2', 'alex-brush-vietnamese.woff2'] },
  { dir: 'parisienne', files: ['parisienne-latin.woff2', 'parisienne-latin-ext.woff2'] },
  { dir: 'cormorant-garamond', files: ['cormorant-garamond-latin.woff2', 'cormorant-garamond-latin-ext.woff2', 'cormorant-garamond-vietnamese.woff2'] },
  { dir: 'playfair-display', files: ['playfair-display-latin.woff2', 'playfair-display-latin-ext.woff2', 'playfair-display-vietnamese.woff2'] },
  { dir: 'cinzel', files: ['cinzel-latin.woff2', 'cinzel-latin-ext.woff2'] },
  { dir: 'marcellus', files: ['marcellus-latin.woff2', 'marcellus-latin-ext.woff2'] },
  { dir: 'lora', files: ['lora-latin.woff2', 'lora-latin-ext.woff2', 'lora-vietnamese.woff2'] },
  { dir: 'bodoni-moda', files: ['bodoni-moda-latin.woff2', 'bodoni-moda-latin-ext.woff2'] },
] as const;

describe('local wedding font assets', () => {
  it('ships every registered WOFF2 asset with a valid signature', () => {
    const seenHashes = new Set<string>();

    for (const family of families) {
      for (const filename of family.files) {
        const path = join(FONT_ROOT, family.dir, filename);
        const bytes = readFileSync(path);
        const publicPath = `/${relative(join(ROOT, 'public'), path).split(sep).join('/')}`;

        expect(bytes.subarray(0, 4).toString('ascii'), publicPath).toBe('wOF2');
        expect(bytes.byteLength, publicPath).toBeGreaterThan(4_000);
        expect(CSS, publicPath).toContain(`url('${publicPath}')`);
        seenHashes.add(createHash('sha256').update(bytes).digest('hex'));
      }
    }

    expect(seenHashes.size).toBe(20);
  });

  it('preserves an OFL 1.1 licence and official metadata for every family', () => {
    for (const family of families) {
      const licence = readFileSync(join(FONT_ROOT, family.dir, 'OFL.txt'), 'utf8');
      const metadata = readFileSync(join(FONT_ROOT, family.dir, 'METADATA.pb'), 'utf8');

      expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(metadata).toContain('license: "OFL"');
    }
  });

  it('does not inject remote stylesheets for local or legacy selections', () => {
    document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((node) => node.remove());

    for (const family of LOCAL_WEDDING_FONTS) loadGoogleFont(family);
    loadGoogleFont('Beauty Mountains');
    loadGoogleFont('ET Emilia Grace Demo');

    expect(document.head.querySelectorAll('link[href*="fonts.googleapis.com"]')).toHaveLength(0);
  });
});
