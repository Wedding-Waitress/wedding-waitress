// Shared theme helper for the guest-facing gallery surfaces
// (upload page, thank-you, password gate, Live View).

export type GalleryBgStyle = 'light' | 'dark' | 'cream';

export interface GalleryTheme {
  themeColor: string;       // accent (buttons, icons)
  themeColorHover: string;
  bgStyle: GalleryBgStyle;
  bgClass: string;          // page background
  surfaceClass: string;     // card/surface bg
  textClass: string;        // primary text
  mutedClass: string;       // secondary text
  borderClass: string;
  coverImageUrl: string | null;
  logoImageUrl: string | null;
  showBranding: boolean;
  isDark: boolean;
}

export const DEFAULT_THEME_COLOR = '#967A59';

function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const num = parseInt(h, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function resolveGalleryTheme(input: {
  theme_color?: string | null;
  background_style?: string | null;
  cover_image_url?: string | null;
  logo_image_url?: string | null;
  show_branding?: boolean | null;
} | null | undefined): GalleryTheme {
  const themeColor =
    input?.theme_color && /^#[0-9a-fA-F]{6}$/.test(input.theme_color)
      ? input.theme_color
      : DEFAULT_THEME_COLOR;
  const bgStyle: GalleryBgStyle =
    input?.background_style === 'light' || input?.background_style === 'dark' || input?.background_style === 'cream'
      ? input.background_style
      : 'cream';

  const isDark = bgStyle === 'dark';
  const bgClass =
    bgStyle === 'dark' ? 'bg-[#0B0B0B]' :
    bgStyle === 'light' ? 'bg-white' :
    'bg-[#F8F5F0]';
  const surfaceClass =
    bgStyle === 'dark' ? 'bg-white/5 border-white/10' :
    bgStyle === 'light' ? 'bg-white border-neutral-200' :
    'bg-white border-[#E8E1D6]';
  const textClass = isDark ? 'text-white' : 'text-[#1D1D1F]';
  const mutedClass = isDark ? 'text-white/70' : 'text-[#6E6E73]';
  const borderClass = isDark ? 'border-white/10' : 'border-[#E8E1D6]';

  return {
    themeColor,
    themeColorHover: shade(themeColor, -0.18),
    bgStyle,
    bgClass,
    surfaceClass,
    textClass,
    mutedClass,
    borderClass,
    coverImageUrl: input?.cover_image_url || null,
    logoImageUrl: input?.logo_image_url || null,
    showBranding: input?.show_branding !== false,
    isDark,
  };
}
