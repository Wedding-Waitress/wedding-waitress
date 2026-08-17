export const FULL_SEATING_CHART_COLORS = [
  '#000000',
  '#C62828',
  '#1565C0',
  '#2E7D32',
  '#967A59',
  '#7E57C2',
  '#E67E22',
] as const;

export type FullSeatingChartColor = (typeof FULL_SEATING_CHART_COLORS)[number];

export const FULL_SEATING_CHART_GUEST_TEXT_SIZES = {
  small: 8,
  standard: 10,
  large: 12,
} as const;

export type FullSeatingChartGuestTextSize = keyof typeof FULL_SEATING_CHART_GUEST_TEXT_SIZES;

export const normalizeFullSeatingChartGuestTextSize = (value: unknown): FullSeatingChartGuestTextSize => {
  if (value === 'small' || value === 'large') return value;
  if (value === 'standard' || value === 'medium') return 'standard';
  return 'standard';
};

export const DEFAULT_FULL_SEATING_CHART_COLOR: FullSeatingChartColor = '#000000';

export const normalizeFullSeatingChartColor = (value: unknown): FullSeatingChartColor =>
  FULL_SEATING_CHART_COLORS.includes(value as FullSeatingChartColor)
    ? value as FullSeatingChartColor
    : DEFAULT_FULL_SEATING_CHART_COLOR;

export interface FullSeatingChartGuestDetails {
  dietary?: string | null;
  relation_display?: string | null;
  relation_role?: string | null;
}

export const capitalizeFullSeatingChartWords = (text: string) =>
  text.replace(/\b\w/g, character => character.toUpperCase());

export const compactFullSeatingChartSeparators = (text: string) =>
  text
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
    .join('/');

export const getFullSeatingChartGuestDetails = (
  guest: FullSeatingChartGuestDetails,
  showDietary: boolean,
  showRelation: boolean,
) => {
  const dietary = showDietary
    && guest.dietary
    && guest.dietary !== 'NA'
    && guest.dietary.toLowerCase() !== 'none'
      ? compactFullSeatingChartSeparators(capitalizeFullSeatingChartWords(guest.dietary))
      : null;
  const relationshipValue = guest.relation_display || guest.relation_role;
  const relationship = showRelation && relationshipValue
    ? compactFullSeatingChartSeparators(capitalizeFullSeatingChartWords(relationshipValue))
    : null;

  return { dietary, relationship };
};

export const formatFullSeatingChartGuestDetails = (
  guest: FullSeatingChartGuestDetails,
  showDietary: boolean,
  showRelation: boolean,
) => {
  const { dietary, relationship } = getFullSeatingChartGuestDetails(guest, showDietary, showRelation);
  return [dietary, relationship].filter(Boolean).join('/');
};
