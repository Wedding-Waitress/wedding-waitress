import { describe, expect, it } from 'vitest';
import { fitSignageToPaper, prepareSignagePdfClone } from './signagePdfExporter';

describe('matching signage preview and selected paper', () => {
  it.each([[841,1189],[594,841],[420,594],[297,420]])('fills the selected %s x %s mm sheet without export-only margins', (width,height) => {
    const fit = fitSignageToPaper(width,height);
    expect(fit).toEqual({ x: 0, y: 0, width, height });
    expect(fit.x).toBeGreaterThanOrEqual(0);
    expect(fit.y).toBeGreaterThanOrEqual(0);
    expect(fit.x * 2 + fit.width).toBeCloseTo(width,10);
    expect(fit.y * 2 + fit.height).toBeCloseTo(height,10);
    expect(Math.min(width - fit.width,height - fit.height)).toBeCloseTo(0,10);
  });
  it.each([[0,297],[-1,297],[NaN,297],[210,Infinity]])('rejects invalid paper dimensions', (width,height) => {
    expect(() => fitSignageToPaper(width,height)).toThrow('valid print size');
  });
  it('removes external presentation without changing internal text and QR transforms', () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '<div style="transform:scale(.5)"><div data-print-mirror-document="seating-chart-sign" style="width:210mm;height:297mm;box-shadow:0 0 10px black"><span style="transform:translate(-50%,-50%) rotate(20deg);font-size:22px">Wendy &amp; Tom</span></div></div>';
    const page = doc.querySelector<HTMLElement>('[data-print-mirror-document]')!;
    const text = page.firstElementChild!.outerHTML;
    prepareSignagePdfClone(doc);
    expect(page.parentElement!.style.transform).toBe('none');
    expect(page.style.boxShadow).toBe('none');
    expect(page.style.width).toBe('210mm');
    expect(page.style.height).toBe('297mm');
    expect(page.firstElementChild!.outerHTML).toBe(text);
  });
});
