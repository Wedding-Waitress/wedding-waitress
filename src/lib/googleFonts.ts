/**
 * Google Fonts dynamic loader
 * Injects <link> tags for Google Fonts on demand, tracking what's already loaded.
 */

const loadedFonts = new Set<string>();

/** Convert font name to Google Fonts URL format */
function toGoogleUrl(fontName: string): string {
  const family = fontName.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;700&display=swap`;
}

/** Load a single Google Font by injecting a <link> tag */
export function loadGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = toGoogleUrl(fontName);
  document.head.appendChild(link);
}

/** Load multiple Google Fonts at once */
export function loadMultipleFonts(fontNames: string[]): void {
  fontNames.forEach(loadGoogleFont);
}

/** Wait for fonts to be ready (best-effort via document.fonts API) */
export async function waitForFonts(fontNames: string[], timeoutMs = 3000): Promise<void> {
  loadMultipleFonts(fontNames);
  if (!document.fonts?.ready) {
    await new Promise(r => setTimeout(r, 500));
    return;
  }
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, timeoutMs)),
    ]);
  } catch {
    // Fallback delay
    await new Promise(r => setTimeout(r, 500));
  }
}

// ── Curated wedding font catalogue ──

export interface FontEntry {
  name: string;
  category: 'serif' | 'sans-serif' | 'script' | 'display';
}

export const WEDDING_FONTS: FontEntry[] = [
  // Serif
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Cinzel', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'Spectral', category: 'serif' },
  { name: 'DM Serif Display', category: 'serif' },

  // Sans-Serif
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Josefin Sans', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Quicksand', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },

  // Script / Handwriting
  { name: 'Great Vibes', category: 'script' },
  { name: 'Dancing Script', category: 'script' },
  { name: 'Alex Brush', category: 'script' },
  { name: 'Parisienne', category: 'script' },
  { name: 'Sacramento', category: 'script' },
  { name: 'Tangerine', category: 'script' },
  { name: 'Allura', category: 'script' },
  { name: 'Satisfy', category: 'script' },
  { name: 'Pinyon Script', category: 'script' },
  { name: 'Rouge Script', category: 'script' },

  // Display
  { name: 'Italiana', category: 'display' },
  { name: 'Poiret One', category: 'display' },
  { name: 'Tenor Sans', category: 'display' },
  { name: 'Cormorant SC', category: 'display' },
  { name: 'Marcellus', category: 'display' },
  { name: 'Forum', category: 'display' },
  { name: 'Yeseva One', category: 'display' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  serif: 'Serif',
  'sans-serif': 'Sans-Serif',
  script: 'Script / Handwriting',
  display: 'Display',
};
