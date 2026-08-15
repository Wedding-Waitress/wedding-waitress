import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  FOOTER_PANEL_HEIGHT,
  FOOTER_PANEL_WIDTH,
  PB_PRINT_DPI,
  PB_PRINT_INCHES,
  PB_STRIP_COUNT,
  PB_STRIP_CUT_X,
  PB_STRIP_LAYOUT,
  PB_STRIP_PRINT,
  PB_STRIP_SINGLE,
  composeStrip,
  makePhotoStripDesignTemplate,
  photoBoothStripRects,
  assertStripBitmapDimensions,
  validateMasterTemplateSize,
} from './photoBoothTemplate';

describe('printer-ready Photo Booth strip geometry', () => {
  it('defines one exact 4 × 6 inch, 300 DPI master split at x = 600', () => {
    expect(PB_PRINT_DPI).toBe(300);
    expect(PB_PRINT_INCHES).toEqual({ w: 4, h: 6 });
    expect(PB_STRIP_PRINT).toEqual({ w: 1200, h: 1800 });
    expect(PB_STRIP_SINGLE).toEqual({ w: 600, h: 1800 });
    expect(PB_STRIP_CUT_X).toBe(600);
    expect(FOOTER_PANEL_WIDTH).toBe(600);
    expect(FOOTER_PANEL_HEIGHT).toBe(PB_STRIP_LAYOUT.footerHeight);
  });

  it('calculates four identical, ordered landscape photo rectangles in both halves', () => {
    const geometry = photoBoothStripRects();
    expect(geometry.master).toEqual({ x: 0, y: 0, w: 1200, h: 1800 });
    expect(geometry.photos).toHaveLength(2);
    expect(geometry.photos[0]).toHaveLength(PB_STRIP_COUNT);
    expect(geometry.photos[0]).toEqual([
      { x: 36, y: 52, w: 528, h: 355 },
      { x: 36, y: 431, w: 528, h: 355 },
      { x: 36, y: 810, w: 528, h: 355 },
      { x: 36, y: 1189, w: 528, h: 355 },
    ]);
    expect(geometry.photos[1]).toEqual(geometry.photos[0].map(rect => ({ ...rect, x: rect.x + 600 })));
    expect(geometry.footers).toEqual([
      { x: 0, y: 1544, w: 600, h: 256 },
      { x: 600, y: 1544, w: 600, h: 256 },
    ]);
    expect(geometry.photos[0][3].y + geometry.photos[0][3].h).toBe(geometry.footers[0].y);
  });

  it('renders the four source photos into the same ordered rectangles on both strips', async () => {
    const drawImage = vi.fn();
    const context = {
      drawImage,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 10 }),
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      textAlign: 'start',
      textBaseline: 'alphabetic',
      font: '',
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const createElement = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (
      tagName === 'canvas' ? canvas : document.createElement(tagName)
    )) as typeof document.createElement);

    try {
      const photos = Array.from({ length: 4 }, (_, index) => ({ width: 1600 + index, height: 900 })) as HTMLCanvasElement[];
      const output = await composeStrip(photos, {
        title: 'Test Event', dateText: '14 August 2026', bottomText: null,
        hashtag: undefined, logoUrl: null, templateUrl: null, showBranding: false,
      });
      expect({ width: output.width, height: output.height }).toEqual({ width: 1200, height: 1800 });
      const destinations = drawImage.mock.calls.map(call => call.slice(5, 9));
      expect(destinations).toEqual(photoBoothStripRects().photos.flat().map(rect => [rect.x, rect.y, rect.w, rect.h]));
      expect(drawImage.mock.calls.slice(0, 4).map(call => call[0])).toEqual(photos);
      expect(drawImage.mock.calls.slice(4).map(call => call[0])).toEqual(photos);
    } finally {
      createElement.mockRestore();
    }
  });

  it('accepts only an exact 1200 × 1800 full-master upload and reports detected dimensions', () => {
    expect(validateMasterTemplateSize(1200, 1800)).toEqual({ ok: true, width: 1200, height: 1800 });
    const invalid = validateMasterTemplateSize(1440, 2000);
    expect(invalid.ok).toBe(false);
    expect(invalid.message).toContain('1440 × 2000 px');
    expect(invalid.message).toContain('1200 × 1800 px');
    expect(invalid.message).toContain('both 2 × 6 inch strips');
  });

  it('builds the downloadable design guide from the exact shared photo, branding and footer rectangles', () => {
    const fillRect = vi.fn();
    const strokeRect = vi.fn();
    const fillText = vi.fn();
    const context = {
      fillRect,
      strokeRect,
      fillText,
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      textAlign: 'start',
      textBaseline: 'alphabetic',
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (
      tagName === 'canvas' ? canvas : originalCreateElement(tagName)
    )) as typeof document.createElement);

    try {
      const guide = makePhotoStripDesignTemplate();
      const geometry = photoBoothStripRects();
      expect({ width: guide.width, height: guide.height }).toEqual({
        width: PB_STRIP_PRINT.w,
        height: PB_STRIP_PRINT.h,
      });
      for (const rect of geometry.photos.flat()) {
        expect(fillRect).toHaveBeenCalledWith(rect.x, rect.y, rect.w, rect.h);
        expect(strokeRect).toHaveBeenCalledWith(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      }
      for (const rect of [...geometry.headers, ...geometry.footers]) {
        expect(fillRect).toHaveBeenCalledWith(rect.x, rect.y, rect.w, rect.h);
      }
      expect(fillText.mock.calls.filter(([text]) => text === 'GUEST PHOTO – COVERED AREA')).toHaveLength(8);
      expect(fillText.mock.calls.filter(([text]) => text === 'FIXED BRANDING AREA')).toHaveLength(2);
      expect(fillText.mock.calls.filter(([text]) => text === 'FOOTER AREA')).toHaveLength(2);
      expect(context.moveTo).toHaveBeenCalledWith(PB_STRIP_CUT_X, 0);
      expect(context.lineTo).toHaveBeenCalledWith(PB_STRIP_CUT_X, PB_STRIP_PRINT.h);
    } finally {
      createElement.mockRestore();
    }
  });

  it('rejects any generated or downloaded bitmap that is not exactly 1200 × 1800', () => {
    expect(() => assertStripBitmapDimensions(1200, 1800)).not.toThrow();
    expect(() => assertStripBitmapDimensions(1199, 1800)).toThrow(/1199 × 1800 px/);
    expect(() => assertStripBitmapDimensions(1200, 1799)).toThrow(/1200 × 1799 px/);
  });

  it('keeps preview and public export wired to the shared compositor', () => {
    const preview = fs.readFileSync(path.join(process.cwd(), 'src/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview.tsx'), 'utf8');
    const guest = fs.readFileSync(path.join(process.cwd(), 'src/pages/GuestPhotoBooth.tsx'), 'utf8');
    expect(preview).toContain('await composeStrip(');
    expect(guest).toContain('await composeStripBlob(nextPhotos, buildComposeOpts())');
    expect(guest).toContain('const finalBlob = blob;');
    expect(guest).toContain('const singles = mode === \'strip\' ? stripPhotos : [];');
  });
});
