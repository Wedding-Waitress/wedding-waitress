import { describe, it, expect } from 'vitest';
import {
  FOOTER_PANEL_WIDTH,
  FOOTER_PANEL_HEIGHT,
  PB_STRIP_PRINT,
  PB_STRIP_SINGLE,
  PB_STRIP_FOOTER_RATIO,
  footerPanelMm,
  validateFooterPanelSize,
} from './photoBoothTemplate';

describe('footer panel dimensions', () => {
  it('matches the strip renderer geometry exactly', () => {
    expect(FOOTER_PANEL_WIDTH).toBe(PB_STRIP_SINGLE.w);
    expect(FOOTER_PANEL_HEIGHT).toBe(Math.round(PB_STRIP_PRINT.h * PB_STRIP_FOOTER_RATIO));
    expect(FOOTER_PANEL_WIDTH).toBe(720);
    expect(FOOTER_PANEL_HEIGHT).toBe(216);
  });

  it('is exactly half the print canvas width', () => {
    expect(FOOTER_PANEL_WIDTH * 2).toBe(PB_STRIP_PRINT.w);
  });

  it('reports 300 DPI millimetres', () => {
    const mm = footerPanelMm();
    expect(mm.w).toBeCloseTo(61, 0);
    expect(mm.h).toBeCloseTo(18.3, 1);
  });
});

describe('validateFooterPanelSize', () => {
  it('accepts an exact match', () => {
    expect(validateFooterPanelSize(FOOTER_PANEL_WIDTH, FOOTER_PANEL_HEIGHT).ok).toBe(true);
  });

  it('rejects any other size with a helpful message', () => {
    const r = validateFooterPanelSize(1200, 500);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('1200 × 500 px');
    expect(r.message).toContain(`${FOOTER_PANEL_WIDTH} × ${FOOTER_PANEL_HEIGHT} px`);
    expect(r.message).toContain('blank footer template');
  });
});
