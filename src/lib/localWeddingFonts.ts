export const LOCAL_WEDDING_FONTS = [
  'Alex Brush',
  'Parisienne',
  'Cormorant Garamond',
  'Playfair Display',
  'Cinzel',
  'Marcellus',
  'Lora',
  'Bodoni Moda',
] as const;

export type LocalWeddingFont = (typeof LOCAL_WEDDING_FONTS)[number];

const LOCAL_WEDDING_FONT_SET = new Set<string>(LOCAL_WEDDING_FONTS);

/**
 * Compatibility mapping for settings saved before the licensed local font
 * collection replaced the unavailable font files. These legacy labels are
 * never presented in the picker and are never registered as font-family
 * aliases; persisted values resolve to the replacement's real family name.
 */
const LEGACY_WEDDING_FONT_REPLACEMENTS: Readonly<Record<string, LocalWeddingFont>> = {
  'Beauty Mountains': 'Alex Brush',
  'Valentine Baby': 'Parisienne',
  Amsterdam: 'Cormorant Garamond',
  'Back to Black Demo': 'Playfair Display',
  Flagfies: 'Cinzel',
  'Sphere Memory': 'Marcellus',
  'ET Emilia Grace Demo': 'Lora',
  Grained: 'Bodoni Moda',
};

const SCRIPT_FONTS = new Set<string>(['Alex Brush', 'Parisienne']);

export function resolveWeddingFontFamily(fontName?: string | null): string {
  if (!fontName) return '';
  return LEGACY_WEDDING_FONT_REPLACEMENTS[fontName] ?? fontName;
}

export function isLocalWeddingFont(fontName?: string | null): boolean {
  return LOCAL_WEDDING_FONT_SET.has(resolveWeddingFontFamily(fontName));
}

export function weddingFontFamilyStack(fontName?: string | null): string {
  const resolved = resolveWeddingFontFamily(fontName) || 'Lora';
  const escaped = resolved.replace(/["\\]/g, '\\$&');
  const fallback = SCRIPT_FONTS.has(resolved)
    ? '"Segoe Script", "Brush Script MT", cursive'
    : 'Georgia, "Times New Roman", serif';
  return `"${escaped}", ${fallback}`;
}

export function resolveWeddingFontZones<T extends { font_family: string }>(zones: T[]): T[] {
  return zones.map((zone) => ({
    ...zone,
    font_family: resolveWeddingFontFamily(zone.font_family),
  }));
}

export function resolveWeddingFontStyleMap<T extends Record<string, unknown>>(
  styles: T,
): T {
  return Object.fromEntries(
    Object.entries(styles).map(([key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [key, value];
      const style = value as Record<string, unknown>;
      if (typeof style.font_family !== 'string') return [key, value];
      return [key, { ...style, font_family: resolveWeddingFontFamily(style.font_family) }];
    }),
  ) as T;
}
