import { describe, expect, it } from 'vitest';
import { alignDietaryPdfTextInClone, DIETARY_PDF_TEXT_OFFSETS } from './dietaryChartPdfExporter';

describe('dietary chart PDF clone text alignment', () => {
  it('moves only marked clone text upward without changing its row box styles', () => {
    const livePreview = document.createElement('div');
    livePreview.innerHTML = `
      <p data-pdf-text-nudge="total" style="line-height: 1.2; margin-top: 1mm">Total: <strong>2</strong></p>
      <table>
        <thead>
          <tr data-summary-row="true" style="height: 42px"><th colspan="7" style="padding: 3px 5px">
            <div data-pdf-text-nudge="summary" style="display: flex; flex-direction: column; row-gap: 2px">
              <div>Kids Meal · Pescatarian · Vegetarian · Vegan · Seafood Free · Gluten Free</div>
              <div>Dairy Free · Nut Free · Halal · Kosher · Vendor</div>
            </div>
          </th></tr>
          <tr data-heading-row="true" style="height: 26px">
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">First Name</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Last Name</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Table</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Seat</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Dietary</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Mobile</th>
            <th data-pdf-text-nudge="column-heading" style="padding: 3px 5px; text-align: left">Relation</th>
          </tr>
        </thead>
        <tbody><tr data-guest-row="true" style="height: 28px">
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">Andrew</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">King</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">4</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">2</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">Gluten Free</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">-</td>
          <td data-pdf-text-nudge="guest-cell" style="padding: 4px 5px; vertical-align: middle; text-align: left">Guest</td>
          <td data-unmarked="true">Unchanged</td>
        </tr></tbody>
      </table>
    `;
    const clonedPreview = livePreview.cloneNode(true) as HTMLElement;
    const clonedDocument = document.implementation.createHTMLDocument();
    clonedDocument.body.appendChild(clonedPreview);

    alignDietaryPdfTextInClone(clonedDocument);

    const liveCell = livePreview.querySelector<HTMLElement>('[data-pdf-text-nudge="guest-cell"]')!;
    const clonedCell = clonedPreview.querySelector<HTMLElement>('[data-pdf-text-nudge="guest-cell"]')!;
    const clonedTotal = clonedPreview.querySelector<HTMLElement>('[data-pdf-text-nudge="total"]')!;
    const clonedSummary = clonedPreview.querySelector<HTMLElement>('[data-pdf-text-nudge="summary"]')!;
    const clonedHeadings = Array.from(clonedPreview.querySelectorAll<HTMLElement>('[data-pdf-text-nudge="column-heading"]'));
    const clonedGuestCells = Array.from(clonedPreview.querySelectorAll<HTMLElement>('[data-pdf-text-nudge="guest-cell"]'));

    expect(liveCell.children).toHaveLength(0);
    expect(liveCell.style.padding).toBe('4px 5px');
    expect(clonedCell.style.padding).toBe('4px 5px');
    expect(clonedCell.style.verticalAlign).toBe('middle');
    expect(clonedCell.firstElementChild).toMatchObject({ tagName: 'SPAN' });
    expect((clonedCell.firstElementChild as HTMLElement).style.transform).toBe(`translateY(${DIETARY_PDF_TEXT_OFFSETS.guestCell}px)`);
    expect((clonedTotal.firstElementChild as HTMLElement).style.transform).toBe('translateY(-4px)');
    expect((clonedSummary.firstElementChild as HTMLElement).style.transform).toBe(`translateY(${DIETARY_PDF_TEXT_OFFSETS.summary}px)`);
    expect(clonedSummary.querySelectorAll(':scope > [data-dietary-pdf-text-group="summary"]')).toHaveLength(1);
    expect(clonedSummary.querySelector('[data-dietary-pdf-text-group="summary"]')?.children).toHaveLength(2);
    expect(clonedHeadings).toHaveLength(7);
    expect(clonedHeadings.every(cell => (cell.firstElementChild as HTMLElement).dataset.dietaryPdfTextGroup === 'column-heading')).toBe(true);
    expect(clonedHeadings.every(cell => (cell.firstElementChild as HTMLElement).style.transform === `translateY(${DIETARY_PDF_TEXT_OFFSETS.columnHeading}px)`)).toBe(true);
    expect(clonedGuestCells).toHaveLength(7);
    expect(clonedGuestCells.every(cell => (cell.firstElementChild as HTMLElement).dataset.dietaryPdfTextGroup === 'guest-cell')).toBe(true);
    expect(clonedGuestCells.every(cell => (cell.firstElementChild as HTMLElement).style.transform === `translateY(${DIETARY_PDF_TEXT_OFFSETS.guestCell}px)`)).toBe(true);
    expect(clonedSummary.style.rowGap).toBe('2px');
    expect(clonedCell.style.textAlign).toBe(liveCell.style.textAlign);
    expect(clonedCell.closest('tr')?.getAttribute('style')).toBe(liveCell.closest('tr')?.getAttribute('style'));
    expect(clonedPreview.querySelector('[data-summary-row="true"]')?.getAttribute('style')).toBe(livePreview.querySelector('[data-summary-row="true"]')?.getAttribute('style'));
    expect(clonedPreview.querySelector('[data-heading-row="true"]')?.getAttribute('style')).toBe(livePreview.querySelector('[data-heading-row="true"]')?.getAttribute('style'));
    expect(livePreview.querySelectorAll('[data-pdf-text-nudge] > span')).toHaveLength(0);
    expect(livePreview.querySelectorAll('[data-dietary-pdf-text-group]')).toHaveLength(0);
    expect(clonedPreview.querySelector('[data-unmarked="true"]')?.children).toHaveLength(0);
  });
});
