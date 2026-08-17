import { describe, expect, it } from 'vitest';
import {
  chunkDietaryGuests,
  DEFAULT_DIETARY_ACCENT_COLOR,
  DIETARY_ACCENT_COLORS,
  DIETARY_GUEST_TEXT_SIZES,
  packDietaryGuestPages,
  hexToRgb,
  normalizeDietaryAccentColor,
  normalizeDietaryGuestTextSize,
} from './dietaryChartSettings';

describe('dietary chart display customisation', () => {
  it('supports exactly the requested guest text sizes and defaults legacy values to standard', () => {
    expect(DIETARY_GUEST_TEXT_SIZES).toEqual({ small: 8, standard: 10, large: 12 });
    expect(normalizeDietaryGuestTextSize(undefined)).toBe('standard');
    expect(normalizeDietaryGuestTextSize('medium')).toBe('standard');
    expect(normalizeDietaryGuestTextSize('small')).toBe('small');
    expect(normalizeDietaryGuestTextSize('large')).toBe('large');
  });

  it('packs intact measured rows without missing or duplicating guests', () => {
    const guests = Array.from({ length: 7 }, (_, index) => ({ id: String(index + 1) }));
    const heights = new Map(guests.map((guest, index) => [guest.id, index === 2 ? 20 : 10]));
    const pages = packDietaryGuestPages(guests, heights, 30, 10);
    expect(pages.map(page => page.map(guest => guest.id))).toEqual([['1', '2'], ['3', '4'], ['5', '6', '7']]);
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it.each(['small', 'standard', 'large'])('groups %s preview pages as 25, 25, 19', () => {
    const guests = Array.from({ length: 69 }, (_, index) => ({ id: String(index + 1) }));
    const pages = chunkDietaryGuests(guests, 25);

    expect(pages.map(page => page.length)).toEqual([25, 25, 19]);
    expect(pages[0].at(-1)?.id).toBe('25');
    expect(pages[1][0].id).toBe('26');
    expect(pages[1].at(-1)?.id).toBe('50');
    expect(pages[2][0].id).toBe('51');
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it('limits Small — 8 pt pages to 24 complete guests before rendering', () => {
    const guests = Array.from({ length: 69 }, (_, index) => ({ id: String(index + 1) }));
    const heights = new Map(guests.map(guest => [guest.id, 8]));
    const pages = packDietaryGuestPages(guests, heights, 1000, 8, 24);

    expect(pages.map(page => page.length)).toEqual([24, 24, 21]);
    expect(pages[0].at(-1)?.id).toBe('24');
    expect(pages[1][0].id).toBe('25');
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it('limits Standard — 10 pt pages to 24 complete guests before rendering', () => {
    const guests = Array.from({ length: 69 }, (_, index) => ({ id: String(index + 1) }));
    const pages = chunkDietaryGuests(guests, 24);

    expect(pages.map(page => page.length)).toEqual([24, 24, 21]);
    expect(pages[0].at(-1)?.id).toBe('24');
    expect(pages[1][0].id).toBe('25');
    expect(pages[1].at(-1)?.id).toBe('48');
    expect(pages[2][0].id).toBe('49');
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it('limits Large — 12 pt preview pages to 24 complete guests before rendering', () => {
    const guests = Array.from({ length: 69 }, (_, index) => ({ id: String(index + 1) }));
    const pages = chunkDietaryGuests(guests, 24);

    expect(pages.map(page => page.length)).toEqual([24, 24, 21]);
    expect(pages[0].at(-1)?.id).toBe('24');
    expect(pages[1][0].id).toBe('25');
    expect(pages[1].at(-1)?.id).toBe('48');
    expect(pages[2][0].id).toBe('49');
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it('moves a wrapped Standard — 10 pt row intact to the next page', () => {
    const guests = Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1) }));
    const heights = new Map(guests.map(guest => [guest.id, guest.id === '24' ? 20 : 10]));
    const pages = packDietaryGuestPages(guests, heights, 24 * 10, 10, 24);

    expect(pages[0].at(-1)?.id).toBe('23');
    expect(pages[1][0].id).toBe('24');
    expect(pages.flat().map(guest => guest.id)).toEqual(guests.map(guest => guest.id));
  });

  it('moves a wrapped Small — 8 pt row early when it cannot fit safely', () => {
    const guests = Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1) }));
    const heights = new Map(guests.map(guest => [guest.id, guest.id === '24' ? 24 : 8]));
    const pages = packDietaryGuestPages(guests, heights, 192, 8, 24);

    expect(pages[0].at(-1)?.id).toBe('23');
    expect(pages[1][0].id).toBe('24');
    expect(pages.flat()).toHaveLength(25);
  });

  it.each(DIETARY_ACCENT_COLORS)('accepts and converts colour %s', color => {
    expect(normalizeDietaryAccentColor(color)).toBe(color);
    expect(hexToRgb(color)).toEqual(expect.objectContaining({ r: expect.any(Number), g: expect.any(Number), b: expect.any(Number) }));
  });

  it('defaults invalid saved colours to black', () => {
    expect(DEFAULT_DIETARY_ACCENT_COLOR).toBe('#000000');
    expect(normalizeDietaryAccentColor('#FFFF00')).toBe('#000000');
  });

  it('keeps all seven colours in the required display order', () => {
    expect(DIETARY_ACCENT_COLORS).toEqual([
      '#000000',
      '#C62828',
      '#1565C0',
      '#2E7D32',
      '#967A59',
      '#7E57C2',
      '#E67E22',
    ]);
  });
});
