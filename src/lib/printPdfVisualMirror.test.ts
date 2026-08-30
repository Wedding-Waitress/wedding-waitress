import { describe, expect, it } from 'vitest';
import { comparePrintMirrorPixels } from './printPdfVisualMirror';

const whiteImage = (pixels: number) => new Uint8ClampedArray(Array.from({ length: pixels * 4 }, (_, index) => index % 4 === 3 ? 255 : 255));

describe('print/PDF visual mirror comparison', () => {
  it('allows only small raster antialiasing differences', () => {
    const preview = whiteImage(1_000);
    const pdf = preview.slice();
    for (let index = 0; index < 8; index += 1) pdf[index * 4] = 245;
    expect(comparePrintMirrorPixels(preview, pdf)).toMatchObject({ passed: true, differentPixels: 0 });
  });

  it('fails coherent geometry, wrapping, clipping, or missing-content differences', () => {
    const preview = whiteImage(1_000);
    const shiftedLayout = preview.slice();
    for (let pixel = 0; pixel < 20; pixel += 1) {
      shiftedLayout[pixel * 4] = 0;
      shiftedLayout[pixel * 4 + 1] = 0;
      shiftedLayout[pixel * 4 + 2] = 0;
    }
    const result = comparePrintMirrorPixels(preview, shiftedLayout);
    expect(result.passed).toBe(false);
    expect(result.differentPixels).toBe(20);
    expect(result.differentPixelRatio).toBe(0.02);
  });

  it('requires normalised images with identical dimensions', () => {
    expect(() => comparePrintMirrorPixels(new Uint8ClampedArray(8), new Uint8ClampedArray(12))).toThrow(/identical RGBA/);
  });

  it('does not hide a meaningful solid colour change behind raster tolerance', () => {
    const preview = new Uint8ClampedArray([91, 53, 35, 255]);
    const wrongColour = new Uint8ClampedArray([0, 0, 0, 255]);
    expect(comparePrintMirrorPixels(preview, wrongColour, { maximumDifferentPixelRatio: 0 })).toMatchObject({ passed: false, differentPixels: 1 });
  });
});
