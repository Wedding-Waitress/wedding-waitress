import {expect,it} from 'vitest';import {SIGNAGE_PREVIEW_WIDTH_MM,signagePreviewWidthMm} from './signagePreviewSize';
it('uses the existing A1 display width for every desktop print selection',()=>{expect(SIGNAGE_PREVIEW_WIDTH_MM).toBe(213.84);expect(signagePreviewWidthMm(1000)).toBe(213.84)});
it('shrinks only the external preview to fit narrow editing columns',()=>{expect(signagePreviewWidthMm(300)*96/25.4).toBeCloseTo(300);expect(signagePreviewWidthMm(0)).toBe(213.84)});
