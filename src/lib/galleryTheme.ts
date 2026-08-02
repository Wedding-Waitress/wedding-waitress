// Shared theme helper for the guest-facing gallery surfaces
// (upload page, thank-you, password gate, Live View).

export type GalleryBgStyle = 'light' | 'dark' | 'cream';
export type GalleryBgMode = 'preset' | 'color' | 'image';

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
  bgMode: GalleryBgMode;
  bgColor: string | null;
  bgImageUrl: string | null;
  /** Inline style for the page root — carries custom colour / image backgrounds. */
  pageStyle: React.CSSProperties;
}

import type React from 'react';

/**
 * Wedding Waitress gold. This is the permanent accent colour for every
 * guest-facing button and accent — it is intentionally NOT customisable.
 * The `theme_color` column is retained for backwards compatibility only.
 */
export const DEFAULT_THEME_COLOR = '#967A59';

/** Relative luminance test so text stays readable on custom backgrounds. */
export function isDarkHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

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
  background_mode?: string | null;
  background_color?: string | null;
  background_image_url?: string | null;
} | null | undefined): GalleryTheme {
  // Accent colour is fixed to Wedding Waitress gold (no longer customisable).
  const themeColor = DEFAULT_THEME_COLOR;

  const bgStyle: GalleryBgStyle =
    input?.background_style === 'light' || input?.background_style === 'dark' || input?.background_style === 'cream'
      ? input.background_style
      : 'cream';

  const rawMode = input?.background_mode;
  const bgColor =
    input?.background_color && /^#[0-9a-fA-F]{6}$/.test(input.background_color) ? input.background_color : null;
  const bgImageUrl = input?.background_image_url || null;

  let bgMode: GalleryBgMode = rawMode === 'color' || rawMode === 'image' ? rawMode : 'preset';
  if (bgMode === 'color' && !bgColor) bgMode = 'preset';
  if (bgMode === 'image' && !bgImageUrl) bgMode = 'preset';

  const presetDark = bgStyle === 'dark';
  const isDark =
    bgMode === 'color' ? isDarkHex(bgColor as string) :
    bgMode === 'image' ? presetDark :
    presetDark;

  const presetBgClass =
    bgStyle === 'dark' ? 'bg-[#0B0B0B]' :
    bgStyle === 'light' ? 'bg-white' :
    'bg-[#F8F5F0]';
  const bgClass = bgMode === 'preset' ? presetBgClass : '';

  const pageStyle: React.CSSProperties =
    bgMode === 'color'
      ? { backgroundColor: bgColor as string }
      : bgMode === 'image'
        ? {
            backgroundImage: `url("${bgImageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            backgroundColor: presetDark ? '#0B0B0B' : '#F8F5F0',
          }
        : {};

  const surfaceClass = isDark
    ? 'bg-white/5 border-white/10'
    : bgMode === 'preset' && bgStyle === 'light'
      ? 'bg-white border-neutral-200'
      : 'bg-white border-[#E8E1D6]';
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
    bgMode,
    bgColor,
    bgImageUrl,
    pageStyle,
  };
}
