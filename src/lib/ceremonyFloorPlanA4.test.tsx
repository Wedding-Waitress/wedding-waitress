import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Event } from '@/hooks/useEvents';
import type { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import { CeremonyFloorPlanA4 } from '@/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4';
import { CEREMONY_A4, CEREMONY_A4_ASPECT_RATIO, CEREMONY_A4_PAGE_STYLE, getCeremonyA4Layout } from './ceremonyFloorPlanA4';

const makePlan = (overrides: Partial<CeremonyFloorPlan> = {}): CeremonyFloorPlan => ({
  id: 'plan-1', event_id: 'event-1', user_id: 'user-1', chairs_per_row: 4, total_rows: 6, assigned_rows: 3,
  left_side_label: "Groom's Family", right_side_label: "Bride's Family", altar_label: 'Altar', seat_assignments: [],
  show_row_numbers: true, show_seat_numbers: true, bridal_party_left: [], bridal_party_right: [],
  bridal_party_count_left: 3, bridal_party_count_right: 3, bridal_party_roles_left: [], bridal_party_roles_right: [],
  couple_side_arrangement: 'groom_left', person_left_name: 'Groom', person_right_name: 'Bride',
  created_at: '2026-08-19T00:00:00Z', updated_at: '2026-08-19T00:00:00Z', ...overrides,
});

const event = {
  id: 'event-1', name: "Jason & Linda's Wedding", date: '2026-12-20', venue: 'Sheldon Receptions',
  ceremony_date: '2026-12-20', ceremony_venue: 'Garden Chapel', ceremony_start_time: '15:30:00', ceremony_finish_time: '16:30:00',
} as Event;

const generatedAt = new Date('2026-08-19T20:33:00+10:00');

describe('Ceremony Floor Plan A4 renderer', () => {
  it('uses genuine A4 landscape dimensions and deterministic viewport-independent geometry', () => {
    expect(CEREMONY_A4_PAGE_STYLE).toEqual({ width: '297mm', height: '210mm' });
    expect(CEREMONY_A4_ASPECT_RATIO).toBeCloseTo(297 / 210, 12);

    const minimum = getCeremonyA4Layout({ chairsPerRow: 1, totalRows: 1 });
    const normal = getCeremonyA4Layout({ chairsPerRow: 4, totalRows: 6 });
    const maximum = getCeremonyA4Layout({ chairsPerRow: 6, totalRows: 12 });
    expect(minimum.seatWidthMm).toBeGreaterThan(0);
    expect(normal.seatHeightMm).toBeGreaterThan(0);

    const occupiedHeight = (maximum.seatHeightMm * 12) + (maximum.rowGapMm * 11);
    const seatingBudget = CEREMONY_A4.heightMm - CEREMONY_A4.paddingTopMm - CEREMONY_A4.paddingBottomMm
      - CEREMONY_A4.headerHeightMm - CEREMONY_A4.footerHeightMm - CEREMONY_A4.bridalPartyHeightMm - 9;
    expect(occupiedHeight).toBeLessThanOrEqual(seatingBudget);

    const occupiedSideWidth = (maximum.seatWidthMm * 6) + (maximum.seatGapMm * 5) + 5;
    const sideBudget = (CEREMONY_A4.widthMm - (CEREMONY_A4.paddingInlineMm * 2) - CEREMONY_A4.aisleWidthMm - 4) / 2;
    expect(occupiedSideWidth).toBeLessThanOrEqual(sideBudget);
  });

  it('fits the complete maximum 167-person arrangement in one renderer', () => {
    const plan = makePlan({
      chairs_per_row: 6, total_rows: 12, assigned_rows: 12,
      bridal_party_count_left: 10, bridal_party_count_right: 10,
      bridal_party_left: Array.from({ length: 10 }, (_, index) => `Groomsman ${index + 1}`),
      bridal_party_right: Array.from({ length: 10 }, (_, index) => `Bridesmaid ${index + 1}`),
    });
    const { container } = render(<CeremonyFloorPlanA4 floorPlan={plan} event={event} generatedAt={generatedAt} />);

    expect(screen.getByText(/Total Attending Ceremony:/)).toHaveTextContent('167');
    expect(container.querySelectorAll('[data-ceremony-seat]')).toHaveLength(144);
    expect(container.querySelectorAll('[data-ceremony-row]')).toHaveLength(24);
    expect(container.querySelectorAll('[data-row-number="true"]')).toHaveLength(24);
    expect(container.querySelectorAll('[data-ceremony-party-member]')).toHaveLength(20);
    expect(screen.getByText('Best Man')).toBeInTheDocument();
    expect(screen.getByText('Maid of Honor')).toBeInTheDocument();
    expect(container.querySelector('[data-ceremony-a4-header="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-ceremony-a4-footer="true"]')).toHaveTextContent('Page 1 of 1');
    expect(container.querySelector('[data-ceremony-aisle="true"]')).toHaveTextContent("Bride's Walkway – Aisle");
  });

  it('uses the exact family-seat geometry for every 5 + 5 bridal-party position and keeps standard roles readable', () => {
    const plan = makePlan({
      chairs_per_row: 6, total_rows: 12, assigned_rows: 12,
      bridal_party_count_left: 10, bridal_party_count_right: 10,
      bridal_party_left: Array.from({ length: 10 }, (_, index) => `Groomsman ${index + 1}`),
      bridal_party_right: Array.from({ length: 10 }, (_, index) => `Bridesmaid ${index + 1}`),
    });
    const { container } = render(<CeremonyFloorPlanA4 floorPlan={plan} event={event} generatedAt={generatedAt} />);
    const familySeat = container.querySelector<HTMLElement>('[data-family-seat="true"]');
    const partySeats = Array.from(container.querySelectorAll<HTMLElement>('[data-ceremony-party-seat]'));
    expect(familySeat).not.toBeNull();
    expect(partySeats).toHaveLength(20);

    partySeats.forEach(partySeat => {
      expect(partySeat.style.width).toBe(familySeat?.style.width);
      expect(partySeat.style.height).toBe(familySeat?.style.height);
      familySeat?.classList.forEach(className => expect(partySeat).toHaveClass(className));
    });

    expect(container.querySelector('[data-ceremony-party-grid="left"]')).toHaveStyle({ gridTemplateColumns: 'repeat(5, 17.5mm)' });
    expect(container.querySelector('[data-ceremony-party-grid="right"]')).toHaveStyle({ gridTemplateColumns: 'repeat(5, 17.5mm)' });
    expect(container.querySelectorAll('[data-ceremony-party-member^="left-"]')).toHaveLength(10);
    expect(container.querySelectorAll('[data-ceremony-party-member^="right-"]')).toHaveLength(10);
    expect(screen.getAllByText('Groomsman')).toHaveLength(9);
    expect(screen.getByText('Best Man')).toBeInTheDocument();
    expect(screen.getAllByText('Bridesmaid')).toHaveLength(9);
    expect(screen.getByText('Maid of Honor')).toBeInTheDocument();

    const maximum = getCeremonyA4Layout({ chairsPerRow: 6, totalRows: 12 });
    const partyWidth = (maximum.seatWidthMm * 5) + (maximum.seatGapMm * 4);
    const innerWidth = CEREMONY_A4.widthMm - (CEREMONY_A4.paddingInlineMm * 2);
    expect((partyWidth * 2) + 52 + 4).toBeLessThan(innerWidth);
  });

  it('supports row/seat labels off, groom-right placement, long names, and missing optional ceremony details', () => {
    const longName = 'Alexandria Extremely-Long-Celebration-Surname';
    const plan = makePlan({
      show_row_numbers: false, show_seat_numbers: false, couple_side_arrangement: 'bride_left',
      person_left_name: longName, person_right_name: 'Groom', bridal_party_count_left: 1, bridal_party_count_right: 1,
      seat_assignments: [{ side: 'left', row: 1, seat: 1, name: longName }],
    });
    const missingEvent = { ...event, name: 'Second Event', ceremony_date: null, ceremony_venue: null, ceremony_start_time: null, ceremony_finish_time: null, date: null, venue: null } as Event;
    const { container, rerender } = render(<CeremonyFloorPlanA4 floorPlan={plan} event={missingEvent} generatedAt={generatedAt} />);

    expect(container.querySelectorAll('[data-row-number="true"]')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Bridesmaids (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Groomsmen (1)' })).toBeInTheDocument();
    expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
    expect(screen.getByText(/Date TBD/)).toHaveTextContent('Location TBD');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    rerender(<CeremonyFloorPlanA4 floorPlan={plan} event={event} generatedAt={generatedAt} />);
    expect(screen.getByRole('heading', { name: event.name })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Second Event' })).not.toBeInTheDocument();
  });

  it('keeps seat assignment editing wired to the authoritative renderer', async () => {
    const onSeatUpdate = vi.fn().mockResolvedValue(true);
    const { container } = render(<CeremonyFloorPlanA4 floorPlan={makePlan()} event={event} generatedAt={generatedAt} onSeatUpdate={onSeatUpdate} />);
    fireEvent.click(container.querySelector('[data-ceremony-seat="left-1-1"]') as HTMLElement);
    const input = screen.getByRole('textbox', { name: 'left row 1 seat 1' });
    fireEvent.change(input, { target: { value: 'Assigned Guest' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSeatUpdate).toHaveBeenCalledWith('left', 1, 1, 'Assigned Guest');
  });

  it('protects readable header metrics, section gaps, equal circles, and fixed A4 regions', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.module.css'), 'utf8');
    const eventNameRule = css.match(/\.eventName \{([^}]*)\}/)?.[1] ?? '';
    const titleRule = css.match(/\.title \{([^}]*)\}/)?.[1] ?? '';
    const detailsRule = css.match(/\.details \{([^}]*)\}/)?.[1] ?? '';
    const totalRule = css.match(/\.total \{([^}]*)\}/)?.[1] ?? '';
    const sectionHeadingRule = css.match(/\.sectionHeading \{([^}]*)\}/)?.[1] ?? '';
    const personRule = css.match(/\.person \{([^}]*)\}/)?.[1] ?? '';
    const celebrantRule = css.match(/\.celebrant \{([^}]*)\}/)?.[1] ?? '';
    expect(css).toMatch(/\.sheet[\s\S]*width: 297mm;[\s\S]*height: 210mm;/);
    expect(css).toMatch(/\.seat[^}]*overflow: hidden[^}]*font-size: 8pt/);
    expect(css).toMatch(/\.role[^}]*font-size: 8pt[^}]*white-space: normal/);
    expect(css).toMatch(/\.partySeat \{ background: #fbfaf8; \}/);
    expect(css).toMatch(/\.header[^}]*height: 25mm/);
    expect(css).toMatch(/\.footer[^}]*height: 12mm/);
    expect(eventNameRule).toContain('line-height: 1.25');
    expect(eventNameRule).not.toContain('overflow: hidden');
    expect(titleRule).toContain('line-height: 1.25');
    expect(detailsRule).toContain('line-height: 1.3');
    expect(detailsRule).not.toContain('overflow: hidden');
    expect(totalRule).toContain('line-height: 1.3');
    expect(sectionHeadingRule).toContain('min-height: 5mm');
    expect(sectionHeadingRule).toContain('margin: 0 0 1.2mm');
    expect(sectionHeadingRule).not.toContain('overflow: hidden');
    expect(personRule).toContain('width: 16mm');
    expect(personRule).toContain('height: 16mm');
    expect(personRule).toContain('border: 1px solid #5b3523');
    expect(personRule).toContain('font-size: 8pt');
    expect(personRule).toContain('white-space: nowrap');
    expect(celebrantRule).toContain('border: 1px solid #5b3523');
    expect(css).toMatch(/\.aisleLabel[^}]*white-space: nowrap[^}]*transform: rotate\(-90deg\)/);
  });

  it('renders three consistently identified non-wrapping centre people', () => {
    const { container } = render(<CeremonyFloorPlanA4 floorPlan={makePlan()} event={event} generatedAt={generatedAt} />);
    const people = Array.from(container.querySelectorAll<HTMLElement>('[data-ceremony-person]'));
    expect(people).toHaveLength(3);
    expect(people.map(person => person.dataset.ceremonyPerson)).toEqual(['left', 'celebrant', 'right']);
    expect(people[1]).toHaveTextContent('Celebrant');
  });
});
