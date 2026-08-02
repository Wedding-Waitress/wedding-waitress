import { describe, it, expect } from 'vitest';
import {
  BACKGROUND_COLOR_FAMILIES,
  colorNameForHex,
  normalizeHexColor,
} from '@/lib/backgroundColorPalette';

describe('backgroundColorPalette', () => {
  it('has 12 families with 5 shades each', () => {
    expect(BACKGROUND_COLOR_FAMILIES).toHaveLength(12);
    for (const f of BACKGROUND_COLOR_FAMILIES) {
      expect(f.swatches).toHaveLength(5);
      for (const s of f.swatches) {
        expect(s.hex).toMatch(/^#[0-9A-F]{6}$/i);
        expect(s.name.length).toBeGreaterThan(0);
      }
    }
  });

  it('expands 3-digit hex values', () => {
    expect(normalizeHexColor('#abc')).toBe('#AABBCC');
    expect(normalizeHexColor('fff')).toBe('#FFFFFF');
  });

  it('normalises 6-digit hex values', () => {
    expect(normalizeHexColor('#f8f5f0')).toBe('#F8F5F0');
    expect(normalizeHexColor(' F8F5F0 ')).toBe('#F8F5F0');
  });

  it('rejects invalid values', () => {
    expect(normalizeHexColor('')).toBeNull();
    expect(normalizeHexColor('#12')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
    expect(normalizeHexColor('#GGGGGG')).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
  });

  it('resolves palette names', () => {
    expect(colorNameForHex('#f8f5f0')).toBe('Soft cream');
    expect(colorNameForHex('#123456')).toBeNull();
  });
});
