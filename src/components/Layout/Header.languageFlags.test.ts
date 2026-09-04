import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');

const languages = [
  ['en', 'English', 'us'],
  ['it', 'Italiano', 'it'],
  ['ar', 'العربية', 'sa'],
  ['zh', '中文', 'cn'],
  ['vi', 'Tiếng Việt', 'vn'],
  ['hi', 'हिन्दी', 'in'],
  ['tr', 'Türkçe', 'tr'],
  ['de', 'Deutsch', 'de'],
  ['es', 'Español', 'es'],
  ['fr', 'Français', 'fr'],
  ['nl', 'Nederlands', 'nl'],
  ['ja', '日本語', 'jp'],
  ['el', 'Ελληνικά', 'gr'],
] as const;

describe('public header language flags', () => {
  it('keeps every locale in the existing order and maps it to the correct local flag', () => {
    let previousIndex = -1;

    languages.forEach(([code, name, country]) => {
      const definition = `{ code: '${code}', name: '${name}', flagSrc: '/flags/${country}.svg' }`;
      const index = header.indexOf(definition);

      expect(index).toBeGreaterThan(previousIndex);
      expect(existsSync(`public/flags/${country}.svg`)).toBe(true);
      expect(readFileSync(`public/flags/${country}.svg`, 'utf8')).toMatch(/^<svg[^>]+viewBox="0 0 18 14"/);
      previousIndex = index;
    });
  });

  it('renders decorative, consistently sized image flags beside unchanged text labels', () => {
    expect(header).toContain('<img className="ww-language-flag" src={lang.flagSrc} alt="" aria-hidden="true" width="18" height="14" />');
    expect(header).toContain('<span>{lang.name}</span>');
    expect(header).not.toMatch(/[🇦-🇿]{2}/u);
    expect(publicSiteCss).toMatch(/\.ww-selector-item\s*\{\s*gap:\s*\.5rem/);
    expect(publicSiteCss).toMatch(/\.ww-language-flag\s*\{[\s\S]*width:\s*18px;[\s\S]*height:\s*14px;[\s\S]*border-radius:\s*2px/);
  });

  it('preserves selection, keyboard-capable menu primitives, and Arabic direction', () => {
    expect(header).toContain('onClick={() => handleLanguageChange(lang.code)}');
    expect(header).toContain('data-selected={i18n.language === lang.code}');
    expect(header).toContain("dir={lang.code === 'ar' ? 'rtl' : 'ltr'}");
    expect(header).toContain('<DropdownMenuItem key={lang.code}');
    expect(header).toContain('<Globe className="w-4 h-4 mr-1" />');
    expect(header).toContain('{currentLang.code.toUpperCase()}');
  });
});
