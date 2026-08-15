import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PB_INK_DARK,
  PB_SITE_LABEL,
  PB_SITE_LABEL_FONT_SIZE,
  PB_STRIP_PRINT,
  composeStrip,
  photoBoothStripRects,
} from './photoBoothTemplate';

const makeContext = (sampledPixels = new Uint8ClampedArray([255, 255, 255, 255])) => {
  let fillStyle = '';
  let font = '';
  const textDraws: Array<{
    text: string; x: number; y: number; maxWidth?: number; fillStyle: string; font: string;
  }> = [];
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string, x: number, y: number, maxWidth?: number) => {
      textDraws.push({ text, x, y, maxWidth, fillStyle, font });
    }),
    measureText: (text: string) => ({ width: text.length * 10 }),
    getImageData: vi.fn(() => ({ data: sampledPixels })),
    save: vi.fn(), restore: vi.fn(), clearRect: vi.fn(), setLineDash: vi.fn(), strokeRect: vi.fn(),
    textAlign: 'start', textBaseline: 'alphabetic',
    get font() { return font; },
    set font(value: string) { font = value; },
    get fillStyle() { return fillStyle; },
    set fillStyle(value: string) { fillStyle = value; },
    textDraws,
  };
};

const baseOpts = {
  title: 'Test Wedding', dateText: '15 August 2026', bottomText: null,
  hashtag: undefined, logoUrl: null, showBranding: false,
};

describe('Photo Booth saved background rendering', () => {
  const OriginalImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.restoreAllMocks();
  });

  const renderWithImage = async (
    templateUrl: string,
    fails = false,
    sampledPixels?: Uint8ClampedArray,
  ) => {
    const decode = vi.fn(async () => undefined);
    class TestImage {
      crossOrigin = '';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = PB_STRIP_PRINT.w;
      naturalHeight = PB_STRIP_PRINT.h;
      width = PB_STRIP_PRINT.w;
      height = PB_STRIP_PRINT.h;
      complete = true;
      decode = decode;
      private value = '';
      set src(value: string) {
        this.value = value;
        queueMicrotask(() => (fails ? this.onerror?.() : this.onload?.()));
      }
      get src() { return this.value; }
    }
    globalThis.Image = TestImage as unknown as typeof Image;

    const context = makeContext(sampledPixels);
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) =>
      tagName === 'canvas' ? canvas : originalCreateElement(tagName)) as typeof document.createElement);
    const photos = Array.from({ length: 4 }, () => ({ width: 1600, height: 900 })) as HTMLCanvasElement[];
    const report = vi.fn();
    const output = await composeStrip(photos, {
      ...baseOpts,
      templateUrl,
      backgroundMode: 'template',
      templateId: null,
      style: { bgColor: '#967A59' },
      onTemplateLoadError: report,
    });
    return { output, context, decode, report };
  };

  it('decodes and draws the selected JPEG across the exact master before all eight photos', async () => {
    const { output, context, decode, report } = await renderWithImage('https://storage.test/event/custom-template.jpg');
    expect({ width: output.width, height: output.height }).toEqual({
      width: PB_STRIP_PRINT.w,
      height: PB_STRIP_PRINT.h,
    });
    expect(decode).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();

    const calls = context.drawImage.mock.calls;
    expect(calls[0].slice(1)).toEqual([0, 0, 1200, 1800]);
    expect(calls.slice(1).map((call) => call.slice(5, 9))).toEqual(
      photoBoothStripRects().photos.flat().map((rect) => [rect.x, rect.y, rect.w, rect.h]),
    );
    expect(context.fillRect).not.toHaveBeenCalledWith(0, 0, 1200, 1800);
  });

  it('uses one combined branding-region contrast result and one larger font for both labels', async () => {
    const combinedBand = new Uint8ClampedArray(1080 * 44 * 4);
    for (let y = 0; y < 44; y++) {
      for (let x = 0; x < 1080; x++) {
        const value = x < 540 ? 0 : 255;
        const offset = (y * 1080 + x) * 4;
        combinedBand.set([value, value, value, 255], offset);
      }
    }
    const { context } = await renderWithImage(
      'https://storage.test/event/split-tone-template.jpg',
      false,
      combinedBand,
    );
    const labels = context.textDraws.filter(({ text }) => text === PB_SITE_LABEL);

    expect(context.getImageData).toHaveBeenCalledOnce();
    expect(context.getImageData).toHaveBeenCalledWith(60, 4, 1080, 44);
    expect(labels).toEqual([
      {
        text: PB_SITE_LABEL,
        x: 300,
        y: 28,
        maxWidth: 480,
        fillStyle: PB_INK_DARK,
        font: `600 ${PB_SITE_LABEL_FONT_SIZE}px \"Inter\", \"Inter\", system-ui, sans-serif`,
      },
      {
        text: PB_SITE_LABEL,
        x: 900,
        y: 28,
        maxWidth: 480,
        fillStyle: PB_INK_DARK,
        font: `600 ${PB_SITE_LABEL_FONT_SIZE}px \"Inter\", \"Inter\", system-ui, sans-serif`,
      },
    ]);
    expect(new Set(labels.map(({ fillStyle: ink }) => ink))).toEqual(new Set([PB_INK_DARK]));
    expect(PB_SITE_LABEL_FONT_SIZE).toBe(28);
  });

  it('uses the selected colour only in colour mode', async () => {
    const context = makeContext();
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((() => canvas) as typeof document.createElement);
    const photos = Array.from({ length: 4 }, () => ({ width: 1600, height: 900 })) as HTMLCanvasElement[];
    await composeStrip(photos, { ...baseOpts, templateUrl: null, backgroundMode: 'colour', style: { bgColor: '#123456' } });
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1200, 1800);
    expect(context.drawImage).toHaveBeenCalledTimes(8);
  });

  it('reports a failed saved JPEG and then uses the safe colour fallback', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { context, report } = await renderWithImage('https://storage.test/event/custom-template.jpg', true);
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'https://storage.test/event/custom-template.jpg');
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Saved background template could not be loaded'),
      expect.objectContaining({ templateId: null }),
    );
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1200, 1800);
    expect(context.drawImage).toHaveBeenCalledTimes(8);
  });
});
