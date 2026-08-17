import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FullSeatingChartCustomizer } from './FullSeatingChartCustomizer';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import type { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';

const settings: FullSeatingChartSettings = {
  sortBy: 'firstName', fontSize: 'standard', showDietary: true, showGuestNames: true,
  showSeatNumbers: true, showGuestList: true, showRsvp: false, showRelation: true,
  guestNameColor: '#000000', seatNumberColor: '#000000', guestListColor: '#000000',
  dietaryColor: '#000000', relationshipColor: '#000000', showLogo: true,
  paperSize: 'A4', isBold: true, isItalic: false, isUnderline: false,
};

const guest = {
  id: 'guest-1', first_name: 'Alex', last_name: 'Taylor', table_id: null, table_no: 3,
  dietary: 'gluten free', relation_display: 'bride', relation_role: null,
};
const event = { id: 'event-1', name: 'Alex & Sam', date: '2026-08-12', venue: 'Venue', start_time: '18:00', finish_time: '23:00' };

describe('Full Seating Chart guest typography', () => {
  it('renders exactly three ordered size options above the existing Text Style control', () => {
    const { container } = render(<FullSeatingChartCustomizer settings={settings} onSettingsChange={() => undefined} />);
    const text = container.textContent || '';
    expect(text.indexOf('Guest Text Size')).toBeLessThan(text.indexOf('Text Style'));
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/FullSeatingChart/FullSeatingChartCustomizer.tsx'), 'utf8');
    const options = [...source.matchAll(/<SelectItem value="(small|standard|large)">([^<]+)<\/SelectItem>/g)]
      .map(match => [match[1], match[2]]);
    expect(options).toEqual([
      ['small', 'Small — 8 pt'],
      ['standard', 'Standard — 10 pt'],
      ['large', 'Large — 12 pt'],
    ]);
    expect(text).toContain('Bold');
  });

  it.each([
    ['small', '8pt'], ['standard', '10pt'], ['large', '12pt'],
  ] as const)('updates only live guest-list content for %s', (fontSize, expectedSize) => {
    const { container } = render(
      <FullSeatingChartPreview event={event} guests={[guest] as any} settings={{ ...settings, fontSize }} />,
    );
    expect(container.querySelector('[data-guest-name-text="true"]')).toHaveStyle({ fontSize: expectedSize });
    expect(container.querySelector('[data-seat-assignment-text="true"]')).toHaveStyle({ fontSize: expectedSize });
    expect(container.querySelector('[data-dietary-text="true"]')?.parentElement).toHaveStyle({ fontSize: expectedSize });
    expect(container.querySelector('svg')).toHaveAttribute('width', '14');
    expect(container.querySelector('h1')).toHaveStyle({ fontSize: '16pt' });
    expect(container.textContent).toContain('Page 1 of 1');
  });

  it('persists per event and sends the same size setting to both PDF modes', () => {
    const hook = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useFullSeatingChartSettings.ts'), 'utf8');
    const page = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx'), 'utf8');
    const exporter = fs.readFileSync(path.join(process.cwd(), 'src/lib/fullSeatingChartPdfExporter.ts'), 'utf8');
    expect(hook).toContain("fontSize: 'standard'");
    expect(hook).toContain('fontSize: normalizeFullSeatingChartGuestTextSize(data.font_size)');
    expect(hook).toContain('font_size: settingsToSave.fontSize');
    expect(hook).toContain(".eq('event_id', eventId)");
    expect(hook).toContain("onConflict: 'event_id,user_id'");
    expect(page.match(/exportFullSeatingChartToPdf\([^;]+settings/g)?.length).toBe(2);
    expect(exporter).toContain('FULL_SEATING_CHART_GUEST_TEXT_SIZES[settings.fontSize]');
    expect(exporter).toContain('pdf.setFontSize(fontSize)');
  });
});
