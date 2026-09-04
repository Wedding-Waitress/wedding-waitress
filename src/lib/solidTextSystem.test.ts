import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('universal solid-text colour system', () => {
  it('defines one opaque text colour for light and dark surfaces', () => {
    const css = read('src/index.css');

    expect(css).toContain('--ww-text-on-light: #412419;');
    expect(css).toContain('--ww-text-on-dark: #ffffff;');
    expect(css).toContain('--muted-foreground: var(--ww-text-on-light-hsl);');
    expect(css).toContain('--foreground: var(--ww-text-on-light-hsl);');
    expect(css).toContain('data-solid-text-surface="dark"');
    expect(css).toContain('--tw-text-opacity: 1 !important;');
    expect(css).toContain('-webkit-text-fill-color: var(--ww-text-on-dark) !important;');
    expect(css).toContain('#root :where(.ww-button-primary, .ww-button-espresso, .bg-primary, .bg-gradient-primary, .bg-gradient-hero)');
    expect(css).toMatch(/\.gradient-text\s*\{[\s\S]*-webkit-text-fill-color:\s*var\(--ww-text-on-light\)\s*!important/);
  });

  it('uses the light token for public supporting copy and marks dashboard surfaces', () => {
    const publicCss = read('src/styles/PublicSite.css');
    const dashboard = read('src/pages/Dashboard.tsx');

    expect(publicCss).toContain('--ww-muted: var(--ww-text-on-light, #412419);');
    expect(publicCss).toContain('var(--ww-text-on-dark, #ffffff)');
    expect(dashboard).toContain('data-solid-text-surface={isPhotoVideoWorkspace ? \'dark\' : \'light\'}');
  });

  it('keeps protected printable preview renderers outside broad text overrides', () => {
    const css = read('src/index.css');

    expect(css).toContain(':not([class*="preview" i] *)');
    expect(css).toContain(':not([data-print-mirror-document] *)');
    expect(css).toContain(':not(.ww-itc-preview *)');
    expect(css).toContain(':not(.dietary-a4-preview *)');
  });
});
