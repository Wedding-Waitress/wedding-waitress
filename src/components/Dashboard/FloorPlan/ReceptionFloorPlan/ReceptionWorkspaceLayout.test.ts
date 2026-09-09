import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { FIXTURE_CATALOG, FIXTURE_PALETTE_CATALOG } from './fixtures';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Reception lower workspace layout', () => {
  const page = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx');
  const canvas = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx');
  const theme = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanTheme.module.css');
  const smartPanel = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/SmartIntelligencePanel.tsx');
  const sharePanel = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ShareLinkPanel.tsx');

  it('consolidates setup and live status into one responsive venue and notes master panel', () => {
    expect(page.match(/data-reception-setup-master=/g)).toHaveLength(1);
    expect(page).toContain('Reception Setup &amp; Status');
    expect(page.match(/data-reception-setup-card=/g)).toHaveLength(1);
    expect(page.match(/<VendorNotesPanel/g)).toHaveLength(1);
    expect(smartPanel.match(/data-reception-setup-card=/g)).toHaveLength(1);
    expect(page).toContain('attendingCount={attendingCount}');
    expect(page).not.toContain('SmartIntelligencePanel');
    expect(page).not.toContain('data-reception-workspace-status');
    expect(theme).not.toContain('.workspaceStatus');
    expect(theme).toMatch(/\.setupGrid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    expect(theme).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.setupGrid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
    expect(theme).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.setupGrid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  });

  it('keeps Smart Suggestions compact while its open details span the master grid', () => {
    expect(smartPanel).toContain('aria-expanded={open}');
    expect(smartPanel).toContain('data-reception-smart-details="true"');
    expect(smartPanel).toContain('data-reception-smart-priority="true"');
    expect(smartPanel).toContain('data-reception-smart-grid="true"');
    expect(smartPanel).toContain('onClick={() => setOpen(false)}');
    expect(theme).toMatch(/\.smartDetails\s*\{[\s\S]*?grid-column: 1 \/ -1/);
    expect(theme).toMatch(/\.smartSuggestionGrid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    expect(theme).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.smartSuggestionGrid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
    expect(theme).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.smartSuggestionGrid[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  });

  it('renders the remaining sharing panel once in one responsive grid', () => {
    expect(page.match(/<FloorPlanShareModal/g)).toHaveLength(1);
    expect(page.match(/<ChooseVenueDialog/g)).toHaveLength(1);
    expect(page.match(/<SubmitTemplateDialog/g)).toHaveLength(1);
    expect(page).not.toContain('<AutoLayoutPanel');
    expect(page).not.toContain('<RoomShapePanel');
    expect(page).toContain('eventId={selectedEventId} kind="reception"');
    expect(theme).toMatch(/@media \(min-width: 768px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
    expect(theme).toMatch(/@media \(min-width: 1280px\)[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  });

  it('merges live table placement into Fixtures above the one authoritative A4 document', () => {
    expect(canvas).not.toContain('data-reception-tables-palette');
    expect(canvas.match(/data-reception-fixtures-palette=/g)).toHaveLength(1);
    expect(canvas.match(/data-reception-table-placement-status=/g)).toHaveLength(1);
    expect(canvas.match(/data-reception-unplaced-tables=/g)).toHaveLength(1);
    expect(canvas).toContain('Tables to place: {unplacedTables.length}');
    expect(canvas).toContain('All synced tables placed');
    expect(canvas).toContain('handleTableDragStart');
    expect(page).not.toContain('variant="destructive"');
    expect(canvas).toContain('onClick={onResetRequest}');
    expect(canvas).toContain('Reset layout');
    expect(canvas.match(/<ReceptionFloorPlanA4Preview/g)).toHaveLength(1);
    expect(canvas.indexOf('data-reception-fixtures-palette')).toBeLessThan(canvas.indexOf('<ReceptionFloorPlanA4Preview'));
    expect(canvas).not.toContain('lg:w-64');
    expect(canvas).toContain('sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8');
  });

  it('contains the Reception sharing toggle and enabled controls inside the card', () => {
    expect(sharePanel).toContain('data-reception-share-toggle="true"');
    expect(sharePanel).toContain('styles.shareLinkControls');
    expect(sharePanel).toContain('styles.shareUrlField');
    expect(sharePanel).toContain('styles.shareLinkButtons');
    expect(theme).toMatch(/\.shareToggle\[data-state="checked"\][\s\S]*?background: #16a34a/);
    expect(theme).toMatch(/\.shareToggle\[data-state="checked"\] > span[\s\S]*?translateX\(1\.65rem\)/);
    expect(theme).toMatch(/\.shareUrlField[\s\S]*?text-overflow: ellipsis/);
  });

  it('keeps the legacy catalogue while showing 16 non-table fixtures, including Wishing Well, as full-card colour with white content', () => {
    expect(FIXTURE_CATALOG).toHaveLength(17);
    expect(new Set(FIXTURE_CATALOG.map((fixture) => fixture.color)).size).toBe(17);
    expect(FIXTURE_CATALOG).toContainEqual(expect.objectContaining({
      type: 'wishing_well',
      label: 'Wishing Well',
      color: '#8B3F68',
      textColor: '#fff',
    }));
    expect(canvas).toContain('backgroundColor: spec.color');
    expect(canvas).toContain("spec.type === 'dance_floor' || spec.type === 'window'");
    expect(theme).toContain('color: #fff !important');
    expect(theme).toContain('.fixturePaletteCard :is(svg, span)');
    expect(theme).toContain('.fixturePaletteCard:focus-visible');
    expect(theme).toContain('.fixturePaletteCard:active');
    expect(FIXTURE_PALETTE_CATALOG.map((fixture) => fixture.label)).toEqual([
      'Bar',
      'Cake Table',
      'Band Table',
      'Dance Floor',
      'DJ / Band',
      'Door',
      'Gift Table',
      'Kitchen',
      'Photo Booth',
      'Stage',
      'Toilets',
      'Wall',
      'Window',
      'Wishing Well',
      'Add Text',
      'Add Block',
    ]);
  });
});
