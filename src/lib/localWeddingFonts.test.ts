import { describe, expect, it } from 'vitest';
import {
  isLocalWeddingFont,
  LOCAL_WEDDING_FONTS,
  resolveWeddingFontFamily,
  resolveWeddingFontStyleMap,
  resolveWeddingFontZones,
  weddingFontFamilyStack,
} from './localWeddingFonts';

describe('licensed local wedding fonts', () => {
  it('exposes eight distinct replacement family names', () => {
    expect(LOCAL_WEDDING_FONTS).toHaveLength(8);
    expect(new Set(LOCAL_WEDDING_FONTS).size).toBe(8);
  });

  it.each([
    ['Beauty Mountains', 'Alex Brush'],
    ['Valentine Baby', 'Parisienne'],
    ['Amsterdam', 'Cormorant Garamond'],
    ['Back to Black Demo', 'Playfair Display'],
    ['Flagfies', 'Cinzel'],
    ['Sphere Memory', 'Marcellus'],
    ['ET Emilia Grace Demo', 'Lora'],
    ['Grained', 'Bodoni Moda'],
  ])('resolves the retired %s setting to %s', (legacy, replacement) => {
    expect(resolveWeddingFontFamily(legacy)).toBe(replacement);
    expect(isLocalWeddingFont(legacy)).toBe(true);
  });

  it('uses explicit script and serif fallback stacks', () => {
    expect(weddingFontFamilyStack('Alex Brush')).toContain('cursive');
    expect(weddingFontFamilyStack('Lora')).toContain('Georgia');
  });

  it('normalizes persisted text-zone font names without aliases', () => {
    expect(resolveWeddingFontZones([
      { id: 'title', font_family: 'ET Emilia Grace Demo' },
    ])).toEqual([{ id: 'title', font_family: 'Lora' }]);
  });

  it('normalizes persisted invitation style overrides', () => {
    expect(resolveWeddingFontStyleMap({
      title: { font_family: 'Grained', font_size: 24 },
    })).toEqual({ title: { font_family: 'Bodoni Moda', font_size: 24 } });
  });
});
