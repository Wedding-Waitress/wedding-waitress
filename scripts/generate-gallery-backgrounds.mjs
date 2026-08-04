// Generates the built-in Photo & Video Sharing background library.
// Owned, hand-authored SVG artwork — no third-party or hotlinked assets.
// Run: node scripts/generate-gallery-backgrounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'gallery-backgrounds');
mkdirSync(OUT, { recursive: true });

const W = 1600;
const H = 1000;

const wrap = (defs, body, base) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${base}"/>${body}</svg>`;

const linear = (id, from, to, angle = 135) => {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad), y = Math.sin(rad);
  return `<linearGradient id="${id}" x1="${0.5 - x / 2}" y1="${0.5 - y / 2}" x2="${0.5 + x / 2}" y2="${0.5 + y / 2}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
};

const radial = (id, from, to, cx = 0.5, cy = 0.35, r = 0.8) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>`;

// ── pattern helpers ────────────────────────────────────────────────
const dots = (id, color, size = 44, r = 2.4, op = 0.5) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}" opacity="${op}"/></pattern>`;

const grid = (id, color, size = 80, w = 1, op = 0.35) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}"/></pattern>`;

const diagonals = (id, color, size = 34, w = 1.2, op = 0.35) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="${w}" opacity="${op}"/></pattern>`;

const damask = (id, color, size = 160, op = 0.28) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <g fill="none" stroke="${color}" stroke-width="1.6" opacity="${op}">
      <path d="M${size / 2} 18 C${size * 0.78} ${size * 0.3}, ${size * 0.78} ${size * 0.7}, ${size / 2} ${size - 18} C${size * 0.22} ${size * 0.7}, ${size * 0.22} ${size * 0.3}, ${size / 2} 18 Z"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.13}"/>
      <path d="M18 ${size / 2} C${size * 0.3} ${size * 0.28}, ${size * 0.7} ${size * 0.28}, ${size - 18} ${size / 2}"/>
      <path d="M18 ${size / 2} C${size * 0.3} ${size * 0.72}, ${size * 0.7} ${size * 0.72}, ${size - 18} ${size / 2}"/>
    </g>
  </pattern>`;

const petals = (id, color, size = 190, op = 0.3) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <g fill="${color}" opacity="${op}">
      ${Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        const cx = size / 2 + Math.cos(a) * size * 0.19;
        const cy = size / 2 + Math.sin(a) * size * 0.19;
        return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(size * 0.115).toFixed(1)}" ry="${(size * 0.055).toFixed(1)}" transform="rotate(${i * 60} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      }).join('')}
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.035}"/>
    </g>
  </pattern>`;

const leaves = (id, color, size = 150, op = 0.3) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <g fill="none" stroke="${color}" stroke-width="1.8" opacity="${op}" stroke-linecap="round">
      <path d="M${size * 0.2} ${size * 0.8} C${size * 0.35} ${size * 0.5}, ${size * 0.6} ${size * 0.4}, ${size * 0.82} ${size * 0.22}"/>
      ${Array.from({ length: 5 }, (_, i) => {
        const t = 0.2 + i * 0.14;
        const x = size * (0.2 + t * 0.7), y = size * (0.8 - t * 0.72);
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${size * 0.075}" ry="${size * 0.03}" transform="rotate(${-35 + i * 6} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }).join('')}
    </g>
  </pattern>`;

const confetti = (id, colors, size = 170, op = 0.75) => {
  const rnd = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const bits = Array.from({ length: 16 }, (_, i) => {
    const x = rnd(i + 1) * size, y = rnd(i + 40) * size;
    const c = colors[i % colors.length];
    const rot = rnd(i + 90) * 180;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(6 + rnd(i + 7) * 8).toFixed(1)}" height="3.4" rx="1.7" fill="${c}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g opacity="${op}">${bits}</g></pattern>`;
};

const stars = (id, color, size = 220, op = 0.85) => {
  const rnd = (n) => ((Math.sin(n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const pts = Array.from({ length: 26 }, (_, i) => {
    const x = rnd(i + 3) * size, y = rnd(i + 60) * size;
    const r = 0.6 + rnd(i + 11) * 1.5;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${(0.25 + rnd(i + 21) * 0.75).toFixed(2)}"/>`;
  }).join('');
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g opacity="${op}">${pts}</g></pattern>`;
};

const arcs = (id, color, size = 200, op = 0.3) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${color}" stroke-width="1.4" opacity="${op}">${[0.2, 0.34, 0.48].map(f => `<circle cx="0" cy="${size}" r="${size * f * 2}"/>`).join('')}</g></pattern>`;

const fill = (id) => `<rect width="${W}" height="${H}" fill="url(#${id})"/>`;
const vignette = (op = 0.16) =>
  `<radialGradient id="vig" cx="0.5" cy="0.5" r="0.78"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${op}"/></radialGradient>`;

// ── the 24 backgrounds ─────────────────────────────────────────────
const items = [
  // Elegant & luxury
  ['elegant-champagne-silk', 'Champagne Silk', 'Elegant & Luxury', '#F6EFE2',
    linear('g', '#FBF6EC', '#E7D6B8', 120) + damask('p', '#B99A63') + vignette(0.12),
    fill('g') + fill('p') + fill('vig')],
  ['elegant-ivory-damask', 'Ivory Damask', 'Elegant & Luxury', '#FAF7F1',
    linear('g', '#FFFDF8', '#EFE7DA', 150) + damask('p', '#C8B79A', 200, 0.34),
    fill('g') + fill('p')],
  ['elegant-gold-marble', 'Gilded Marble', 'Elegant & Luxury', '#F3EEE7',
    radial('g', '#FFFFFF', '#E4DBCC') +
    `<filter id="mb"><feTurbulence type="fractalNoise" baseFrequency="0.007 0.014" numOctaves="4" seed="7"/><feDisplacementMap in="SourceGraphic" scale="60"/></filter>`,
    fill('g') + `<g filter="url(#mb)" opacity="0.5" fill="none" stroke="#C6A464" stroke-width="2">${Array.from({ length: 7 }, (_, i) => `<path d="M-100 ${120 + i * 130} C 400 ${40 + i * 130}, 900 ${260 + i * 130}, 1700 ${100 + i * 130}"/>`).join('')}</g>`],
  ['elegant-blush-pearl', 'Blush Pearl', 'Elegant & Luxury', '#FBF2F0',
    radial('g', '#FFFFFF', '#F0DCD8', 0.4, 0.3, 0.9) + dots('p', '#D8B9B2', 52, 2.2, 0.55),
    fill('g') + fill('p')],

  // Floral & romantic
  ['floral-rose-garden', 'Rose Garden', 'Floral & Romantic', '#FCF3F2',
    linear('g', '#FFF7F5', '#F3DCDB', 160) + petals('p', '#D89A9A', 190, 0.32),
    fill('g') + fill('p')],
  ['floral-eucalyptus', 'Eucalyptus', 'Floral & Romantic', '#F3F6F1',
    linear('g', '#FAFCF8', '#E2ECDF', 140) + leaves('p', '#7E9C7E', 150, 0.36),
    fill('g') + fill('p')],
  ['floral-peony-blush', 'Peony Blush', 'Floral & Romantic', '#FCF1F4',
    radial('g', '#FFF9FA', '#F1D6DF', 0.5, 0.25, 0.95) + petals('p', '#DCA6B8', 230, 0.3),
    fill('g') + fill('p')],
  ['floral-lavender-field', 'Lavender Field', 'Floral & Romantic', '#F5F2FA',
    linear('g', '#FBF9FF', '#E3DCF1', 145) + leaves('p', '#9184BC', 170, 0.3),
    fill('g') + fill('p')],

  // Modern & minimal
  ['modern-linen-white', 'Linen White', 'Modern & Minimal', '#FAFAF8',
    linear('g', '#FFFFFF', '#F0F0EC', 135) + diagonals('p', '#D8D8D0', 26, 1, 0.5),
    fill('g') + fill('p')],
  ['modern-soft-grid', 'Soft Grid', 'Modern & Minimal', '#F7F8F9',
    linear('g', '#FFFFFF', '#EDF0F2', 160) + grid('p', '#C9D2D8', 72, 1, 0.5),
    fill('g') + fill('p')],
  ['modern-warm-sand', 'Warm Sand', 'Modern & Minimal', '#F7F1E8',
    linear('g', '#FCF7EF', '#EADFCB', 150) + arcs('p', '#C9B393', 260, 0.3),
    fill('g') + fill('p')],
  ['modern-mist-gradient', 'Morning Mist', 'Modern & Minimal', '#F2F5F7',
    linear('g', '#FFFFFF', '#DCE5EA', 120) + radial('r', '#FFFFFF', '#FFFFFF00', 0.25, 0.2, 0.6),
    fill('g') + `<rect width="${W}" height="${H}" fill="url(#r)" opacity="0.55"/>`],

  // Birthday & celebration
  ['celebration-confetti-cream', 'Confetti Cream', 'Birthday & Celebration', '#FFFBF3',
    linear('g', '#FFFDF8', '#FBEFDC', 150) + confetti('p', ['#E8A0B4', '#F2C879', '#8FBFD9', '#A9C99B'], 170, 0.8),
    fill('g') + fill('p')],
  ['celebration-balloon-pastel', 'Pastel Party', 'Birthday & Celebration', '#FBF6FD',
    linear('g', '#FFFFFF', '#F2E6F6', 140) + dots('p', '#C79CD6', 64, 5, 0.35),
    fill('g') + fill('p')],
  ['celebration-golden-sparkle', 'Golden Sparkle', 'Birthday & Celebration', '#1A1410',
    radial('g', '#3A2C1D', '#120D08', 0.5, 0.4, 0.95) + stars('p', '#F0C87A', 200, 0.9),
    fill('g') + fill('p')],
  ['celebration-citrus-pop', 'Citrus Pop', 'Birthday & Celebration', '#FFF6EC',
    linear('g', '#FFF9F0', '#FCE3C6', 155) + confetti('p', ['#F2A65A', '#E97F63', '#F5CE72'], 150, 0.7),
    fill('g') + fill('p')],

  // Corporate & neutral
  ['corporate-slate-lines', 'Slate Lines', 'Corporate & Neutral', '#F4F6F8',
    linear('g', '#FFFFFF', '#E6EBEF', 130) + diagonals('p', '#B9C4CD', 30, 1.1, 0.4),
    fill('g') + fill('p')],
  ['corporate-navy-fade', 'Navy Fade', 'Corporate & Neutral', '#101B2B',
    linear('g', '#1B2C44', '#0B1220', 140) + grid('p', '#7C93B4', 90, 1, 0.18),
    fill('g') + fill('p')],
  ['corporate-stone-grey', 'Stone Grey', 'Corporate & Neutral', '#F2F2F1',
    linear('g', '#FAFAF9', '#E3E3E1', 145) + dots('p', '#BDBDBA', 40, 1.8, 0.5),
    fill('g') + fill('p')],
  ['corporate-quiet-teal', 'Quiet Teal', 'Corporate & Neutral', '#EFF5F4',
    linear('g', '#F8FCFB', '#DCEAE7', 150) + arcs('p', '#8FB3AC', 300, 0.28),
    fill('g') + fill('p')],

  // Dark & evening
  ['evening-midnight-velvet', 'Midnight Velvet', 'Dark & Evening', '#0B0E17',
    radial('g', '#1A2138', '#07090F', 0.5, 0.35, 1) + stars('p', '#C9D6F0', 240, 0.75),
    fill('g') + fill('p')],
  ['evening-charcoal-gold', 'Charcoal & Gold', 'Dark & Evening', '#131211',
    linear('g', '#232120', '#0C0B0A', 140) + damask('p', '#B38F52', 210, 0.22),
    fill('g') + fill('p')],
  ['evening-plum-dusk', 'Plum Dusk', 'Dark & Evening', '#191021',
    radial('g', '#3A2145', '#120B18', 0.5, 0.3, 1) + dots('p', '#E0C4F0', 70, 1.6, 0.3),
    fill('g') + fill('p')],
  ['evening-deep-emerald', 'Deep Emerald', 'Dark & Evening', '#08201B',
    radial('g', '#12463A', '#061713', 0.45, 0.35, 1) + leaves('p', '#6FBFA0', 190, 0.18),
    fill('g') + fill('p')],
];

const manifest = items.map(([slug, name, category, base, defs, body]) => {
  writeFileSync(join(OUT, `${slug}.svg`), wrap(defs, body, base));
  return { slug, name, category, url: `/gallery-backgrounds/${slug}.svg` };
});

writeFileSync(
  join(process.cwd(), 'src', 'lib', 'galleryBackgroundLibrary.ts'),
  `// AUTO-GENERATED by scripts/generate-gallery-backgrounds.mjs — do not edit by hand.\n` +
  `// Owned, locally-stored SVG backgrounds served from /public/gallery-backgrounds.\n` +
  `export interface GalleryBackgroundPreset {\n  slug: string;\n  name: string;\n  category: string;\n  url: string;\n}\n\n` +
  `export const GALLERY_BACKGROUND_CATEGORIES = ${JSON.stringify([...new Set(manifest.map(m => m.category))], null, 2)} as const;\n\n` +
  `export const GALLERY_BACKGROUND_PRESETS: GalleryBackgroundPreset[] = ${JSON.stringify(manifest, null, 2)};\n\n` +
  `export const isGalleryBackgroundPreset = (url: string | null | undefined): boolean =>\n  !!url && GALLERY_BACKGROUND_PRESETS.some(p => p.url === url);\n`
);

console.log(`Wrote ${manifest.length} backgrounds to public/gallery-backgrounds`);
