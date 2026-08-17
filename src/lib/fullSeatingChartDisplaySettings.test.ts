import { describe, expect, it } from 'vitest';
import {
  FULL_SEATING_CHART_COLORS,
  FULL_SEATING_CHART_GUEST_TEXT_SIZES,
  formatFullSeatingChartGuestDetails,
  getFullSeatingChartGuestDetails,
  normalizeFullSeatingChartColor,
  normalizeFullSeatingChartGuestTextSize,
} from './fullSeatingChartDisplaySettings';

const guest = {
  dietary: 'gluten free',
  relation_display: 'bride / cousin',
};

describe('Full Seating Chart display settings', () => {
  it('supports exactly Small 8 pt, Standard 10 pt and Large 12 pt with a Standard default', () => {
    expect(FULL_SEATING_CHART_GUEST_TEXT_SIZES).toEqual({ small: 8, standard: 10, large: 12 });
    expect(normalizeFullSeatingChartGuestTextSize(undefined)).toBe('standard');
    expect(normalizeFullSeatingChartGuestTextSize('medium')).toBe('standard');
    expect(normalizeFullSeatingChartGuestTextSize('small')).toBe('small');
    expect(normalizeFullSeatingChartGuestTextSize('large')).toBe('large');
  });

  it('provides the requested seven colours in the approved order', () => {
    expect(FULL_SEATING_CHART_COLORS).toEqual([
      '#000000', '#C62828', '#1565C0', '#2E7D32',
      '#967A59', '#7E57C2', '#E67E22',
    ]);
    for (const colour of FULL_SEATING_CHART_COLORS) {
      expect(normalizeFullSeatingChartColor(colour)).toBe(colour);
    }
  });

  it('falls back to black when a saved setting contains the removed gold colour', () => {
    expect(normalizeFullSeatingChartColor('#D4AF37')).toBe('#000000');
  });

  it.each([
    [true, true, 'Gluten Free/Bride/Cousin'],
    [true, false, 'Gluten Free'],
    [false, true, 'Bride/Cousin'],
    [false, false, ''],
  ])('formats dietary=%s relationship=%s without empty brackets or duplicate separators', (showDietary, showRelation, expected) => {
    expect(formatFullSeatingChartGuestDetails(guest, showDietary, showRelation)).toBe(expected);
    const details = getFullSeatingChartGuestDetails(guest, showDietary, showRelation);
    expect([details.dietary, details.relationship].filter(Boolean).join('/')).toBe(expected);
  });

  it('removes whitespace, leading, trailing and duplicate slash separators', () => {
    const untidy = {
      dietary: ' halal / / nut free / ',
      relation_display: ' / mahmoud / uncle // ',
    };
    expect(formatFullSeatingChartGuestDetails(untidy, true, true)).toBe('Halal/Nut Free/Mahmoud/Uncle');
    expect(formatFullSeatingChartGuestDetails(untidy, true, false)).toBe('Halal/Nut Free');
    expect(formatFullSeatingChartGuestDetails(untidy, false, true)).toBe('Mahmoud/Uncle');
  });
});
