// Palette + hex helpers for the guest gallery background colour picker.
// Only affects the guest-facing page background — never buttons/accents.

export interface PaletteSwatch {
  name: string;
  hex: string;
}

export interface PaletteFamily {
  family: string;
  swatches: PaletteSwatch[];
}

export const BACKGROUND_COLOR_FAMILIES: PaletteFamily[] = [
  {
    family: 'White & cream',
    swatches: [
      { name: 'Pure white', hex: '#FFFFFF' },
      { name: 'Snow', hex: '#FBFBFA' },
      { name: 'Soft cream', hex: '#F8F5F0' },
      { name: 'Ivory', hex: '#F3EDE3' },
      { name: 'Champagne', hex: '#EADFCB' },
    ],
  },
  {
    family: 'Beige & taupe',
    swatches: [
      { name: 'Pale sand', hex: '#F1E9DD' },
      { name: 'Linen', hex: '#E4D8C6' },
      { name: 'Warm beige', hex: '#D6C4AC' },
      { name: 'Taupe', hex: '#B7A38A' },
      { name: 'Deep taupe', hex: '#8E7A64' },
    ],
  },
  {
    family: 'Brown',
    swatches: [
      { name: 'Latte', hex: '#C8A98A' },
      { name: 'Caramel', hex: '#A9825C' },
      { name: 'Wedding gold', hex: '#967A59' },
      { name: 'Chestnut', hex: '#6B4B31' },
      { name: 'Espresso', hex: '#472C1D' },
    ],
  },
  {
    family: 'Grey & black',
    swatches: [
      { name: 'Mist grey', hex: '#F2F2F3' },
      { name: 'Silver', hex: '#D9D9DC' },
      { name: 'Slate grey', hex: '#8A8A8F' },
      { name: 'Charcoal', hex: '#3A3A3D' },
      { name: 'Near black', hex: '#0B0B0B' },
    ],
  },
  {
    family: 'Red',
    swatches: [
      { name: 'Blush red', hex: '#F7DCDA' },
      { name: 'Soft coral', hex: '#E9A79F' },
      { name: 'Classic red', hex: '#C4453C' },
      { name: 'Wine', hex: '#8E2A26' },
      { name: 'Deep burgundy', hex: '#5A1A19' },
    ],
  },
  {
    family: 'Pink & rose',
    swatches: [
      { name: 'Petal pink', hex: '#FDECF1' },
      { name: 'Blush', hex: '#F6D2DC' },
      { name: 'Rose', hex: '#E3A2B4' },
      { name: 'Dusty rose', hex: '#C4798D' },
      { name: 'Plum rose', hex: '#8B4A5E' },
    ],
  },
  {
    family: 'Orange & terracotta',
    swatches: [
      { name: 'Peach cream', hex: '#FCE7D8' },
      { name: 'Apricot', hex: '#F3C39B' },
      { name: 'Terracotta', hex: '#D08152' },
      { name: 'Burnt orange', hex: '#B25C2C' },
      { name: 'Rust', hex: '#7E3C1C' },
    ],
  },
  {
    family: 'Yellow & gold',
    swatches: [
      { name: 'Butter', hex: '#FCF3D8' },
      { name: 'Soft gold', hex: '#F0DFA8' },
      { name: 'Honey', hex: '#DFBE६'.replace('६', '6') },
      { name: 'Antique gold', hex: '#B79447' },
      { name: 'Bronze', hex: '#8A6D2B' },
    ],
  },
  {
    family: 'Green',
    swatches: [
      { name: 'Mint cream', hex: '#E7F2E6' },
      { name: 'Sage', hex: '#C3D3BC' },
      { name: 'Eucalyptus', hex: '#8FA98A' },
      { name: 'Forest', hex: '#4E6B4A' },
      { name: 'Deep emerald', hex: '#28402A' },
    ],
  },
  {
    family: 'Teal',
    swatches: [
      { name: 'Sea foam', hex: '#E2F1F0' },
      { name: 'Pale teal', hex: '#B6DAD7' },
      { name: 'Teal', hex: '#6FAEA9' },
      { name: 'Deep teal', hex: '#3B7A78' },
      { name: 'Pine teal', hex: '#1F4B4A' },
    ],
  },
  {
    family: 'Blue',
    swatches: [
      { name: 'Ice blue', hex: '#E8F0F8' },
      { name: 'Powder blue', hex: '#C2D8EC' },
      { name: 'Dusty blue', hex: '#8DAAC8' },
      { name: 'Navy blue', hex: '#3C5A80' },
      { name: 'Midnight navy', hex: '#1B2C45' },
    ],
  },
  {
    family: 'Purple',
    swatches: [
      { name: 'Lilac mist', hex: '#F0EAF7' },
      { name: 'Lavender', hex: '#D6C7EA' },
      { name: 'Wisteria', hex: '#A98CC8' },
      { name: 'Amethyst', hex: '#7A5695' },
      { name: 'Deep plum', hex: '#432B58' },
    ],
  },
];

const NAME_BY_HEX = new Map<string, string>();
for (const f of BACKGROUND_COLOR_FAMILIES) {
  for (const s of f.swatches) NAME_BY_HEX.set(s.hex.toUpperCase(), s.name);
}

/** Returns the palette name for a hex value, if it matches a known swatch. */
export function colorNameForHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  return NAME_BY_HEX.get(hex.trim().toUpperCase()) ?? null;
}

/**
 * Normalises user-entered hex input.
 * Accepts 3- or 6-digit values, with or without a leading '#'.
 * Returns an uppercase 6-digit '#RRGGBB' string, or null when invalid.
 */
export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}
