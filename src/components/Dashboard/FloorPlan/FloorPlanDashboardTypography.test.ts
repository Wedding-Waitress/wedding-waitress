import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Floor Plan dashboard typography contract', () => {
  it('sets the shared page hierarchy without changing responsive geometry', () => {
    const css = read('src/components/Dashboard/FloorPlan/FloorPlanPage.module.css');
    expect(css).toMatch(/\.pageHeading\s*\{[\s\S]*font-size:\s*24px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
    expect(css).toMatch(/\.pageDescription,[\s\S]*font-size:\s*13px\s*!important;[\s\S]*font-weight:\s*400\s*!important;[\s\S]*line-height:\s*18px\s*!important;/);
    expect(css).toMatch(/\.featureHeading\s*\{[\s\S]*font-size:\s*20px\s*!important;[\s\S]*font-weight:\s*500\s*!important;/);
    expect(css).toMatch(/\.interfaceLabel\s*\{[\s\S]*font-size:\s*13px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
  });

  it('sets Ceremony settings typography outside the A4 renderer', () => {
    const css = read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.module.css');
    expect(css).toMatch(/\.majorHeading\s*\{[\s\S]*font-size:\s*24px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
    expect(css).toMatch(/\.selectorHeading\s*\{[^}]*font-size:\s*20px;[^}]*font-weight:\s*500;/);
    expect(css).toMatch(/\.totalLabel\s*\{[^}]*font-size:\s*13px;[^}]*font-weight:\s*600;/);
  });

  it('sets Reception panels and portals while preserving both A4 stylesheets', () => {
    const css = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanTheme.module.css');
    expect(css).toContain(':not([data-reception-document-area="true"])');
    expect(css).not.toMatch(/data-reception-a4-renderer[^\n{]*\{/);
    expect(css).toMatch(/\.setupTitle\s*\{[\s\S]*font-size:\s*24px;[\s\S]*font-weight:\s*600;/);
    expect(css).toMatch(/\.setupCardHeading h3\s*\{[\s\S]*font-size:\s*20px;[\s\S]*font-weight:\s*500;/);
    expect(css).toContain(':global(.reception-portal-surface)');

    const ceremonyA4 = read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.module.css');
    const receptionA4 = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.module.css');
    expect(ceremonyA4).toContain('width: 297mm');
    expect(ceremonyA4).toContain('height: 210mm');
    expect(receptionA4).toContain('width: 297mm');
    expect(receptionA4).toContain('height: 210mm');
  });
});
