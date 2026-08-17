export const DIETARY_GUEST_TEXT_SIZES = {
  small: 8,
  standard: 10,
  large: 12,
} as const;

export type DietaryGuestTextSize = keyof typeof DIETARY_GUEST_TEXT_SIZES;

export const DIETARY_ACCENT_COLORS = [
  '#000000',
  '#C62828',
  '#1565C0',
  '#2E7D32',
  '#967A59',
  '#7E57C2',
  '#E67E22',
] as const;

export type DietaryAccentColor = (typeof DIETARY_ACCENT_COLORS)[number];

export const DEFAULT_DIETARY_ACCENT_COLOR: DietaryAccentColor = '#000000';

export const normalizeDietaryGuestTextSize = (value: unknown): DietaryGuestTextSize => {
  if (value === 'small' || value === 'large') return value;
  if (value === 'standard' || value === 'medium') return 'standard';
  return 'standard';
};

export const normalizeDietaryAccentColor = (value: unknown): DietaryAccentColor =>
  DIETARY_ACCENT_COLORS.includes(value as DietaryAccentColor)
    ? value as DietaryAccentColor
    : DEFAULT_DIETARY_ACCENT_COLOR;

export const packDietaryGuestPages = <T extends { id: string }>(
  guests: T[],
  rowHeights: ReadonlyMap<string, number>,
  availableHeight: number,
  fallbackRowHeight: number,
  maximumRowsPerPage?: number,
): T[][] => {
  const pages: T[][] = [];
  let page: T[] = [];
  let usedHeight = 0;

  guests.forEach(guest => {
    const rowHeight = rowHeights.get(guest.id) || fallbackRowHeight;
    const reachedRowLimit = maximumRowsPerPage !== undefined && page.length >= maximumRowsPerPage;
    const exceedsSafeHeight = usedHeight + rowHeight > availableHeight + 0.01;
    if (page.length > 0 && (reachedRowLimit || exceedsSafeHeight)) {
      pages.push(page);
      page = [];
      usedHeight = 0;
    }
    page.push(guest);
    usedHeight += rowHeight;
  });

  if (page.length > 0) pages.push(page);
  return pages;
};

export const chunkDietaryGuests = <T>(guests: T[], maximumRowsPerPage: number): T[][] => {
  const pages: T[][] = [];
  for (let start = 0; start < guests.length; start += maximumRowsPerPage) {
    pages.push(guests.slice(start, start + maximumRowsPerPage));
  }
  return pages;
};

export const hexToRgb = (hex: DietaryAccentColor) => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});
