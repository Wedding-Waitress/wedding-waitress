import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const collectSourceFiles = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectSourceFiles(target);
  return /\.(?:css|ts|tsx)$/.test(entry.name) ? [target] : [];
});

describe('global Wedding Waitress interface font', () => {
  it('loads the complete Latin Manrope family once at the application entry point', () => {
    const sourceFiles = collectSourceFiles(path.join(root, 'src'));
    const imports = sourceFiles.flatMap((file) => {
      const matches = [...fs.readFileSync(file, 'utf8').matchAll(/import\s+['"](@fontsource\/manrope[^'"]*)['"]/g)];
      return matches.map((match) => ({ file, match: match[1] }));
    });

    expect(imports).toHaveLength(1);
    expect(path.relative(root, imports[0].file).replace(/\\/g, '/')).toBe('src/main.tsx');
    expect(imports[0].match).toBe('@fontsource/manrope/latin.css');
  });

  it('applies the shared Manrope stack to interface content, controls, navigation and portals', () => {
    const css = read('src/index.css');
    expect(css).toContain('--ww-interface-font-family: Manrope, ui-sans-serif, system-ui, sans-serif');
    expect(css).toContain('--ww-auth-nav-font-family: var(--ww-interface-font-family)');
    expect(css).toMatch(/body\s*\{[\s\S]*font-family:\s*var\(--ww-interface-font-family\)/);
    expect(css).toMatch(/button,[\s\S]*input,[\s\S]*select,[\s\S]*textarea\s*\{[\s\S]*font-family:\s*var\(--ww-interface-font-family\)/);
    expect(read('tailwind.config.ts')).toContain("'inter': ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif']");
  });

  it('preserves explicit protected document and user-design typography', () => {
    expect(read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPrintPage.tsx')).toContain("fontFamily: 'Arial, Helvetica, sans-serif'");
    expect(read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.module.css')).toContain('font-family: Arial, Helvetica, sans-serif');
    expect(read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.module.css')).toContain('font-family: Arial, Helvetica, sans-serif');
    expect(read('src/components/Dashboard/Invitations/InvitationCardPreview.tsx')).toContain('fontFamily: weddingFontFamilyStack(zone.font_family)');
    expect(read('src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx')).toContain('fontFamily: weddingFontFamilyStack(currentSettings.guest_font_family)');
  });
});
