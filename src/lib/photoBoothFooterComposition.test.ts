import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FOOTER_PANEL_HEIGHT,
  FOOTER_PANEL_SAFE_INSET,
  PB_CANONICAL_BACKGROUND,
  PB_DEFAULT_STYLE,
  PB_FOOTER_BACKDROP_CORNER_RADIUS,
  PB_FOOTER_BACKDROP_MIN_WIDTH_RATIO,
  PB_STRIP_PRINT,
  PB_STRIP_SINGLE,
  composeStrip,
  resolveStripStyle,
} from './photoBoothTemplate';

type TextRecord = { text: string; x: number; y: number; font: string; fillStyle: unknown };

const createCanvasHarness = () => {
  const text: TextRecord[] = [];
  let fillStyle: unknown = '';
  const context = {
    drawImage: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(), clearRect: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), clip: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), translate: vi.fn(), scale: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn((value: string, x: number, y: number) => text.push({ text: value, x, y, font: context.font, fillStyle })),
    measureText: (value: string) => ({ width: value.length * 13 }),
    getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }),
    createRadialGradient: vi.fn(),
    textAlign: 'start', textBaseline: 'alphabetic', font: '', strokeStyle: '', lineWidth: 0,
  };
  Object.defineProperty(context, 'fillStyle', { get: () => fillStyle, set: value => { fillStyle = value; } });
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  return { canvas, context, text };
};

describe('Photo Booth footer composition', () => {
  const OriginalImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.restoreAllMocks();
  });

  const render = async ({
    templateUrl = null,
    footerUrl = null,
    bottomText = null,
    textBackdrop = 'none' as const,
  }: {
    templateUrl?: string | null;
    footerUrl?: string | null;
    bottomText?: string | null;
    textBackdrop?: 'none' | 'white' | 'black';
  } = {}) => {
    class TestImage {
      crossOrigin = '';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth: number = PB_STRIP_PRINT.w;
      naturalHeight: number = PB_STRIP_PRINT.h;
      width: number = PB_STRIP_PRINT.w;
      height: number = PB_STRIP_PRINT.h;
      complete = true;
      decode = vi.fn(async () => undefined);
      set src(value: string) {
        if (value.includes('footer')) {
          this.naturalWidth = this.width = PB_STRIP_SINGLE.w;
          this.naturalHeight = this.height = FOOTER_PANEL_HEIGHT;
        }
        queueMicrotask(() => this.onload?.());
      }
    }
    globalThis.Image = TestImage as unknown as typeof Image;

    const harness = createCanvasHarness();
    vi.spyOn(document, 'createElement').mockImplementation((() => harness.canvas) as typeof document.createElement);
    const photos = Array.from({ length: 4 }, () => ({ width: 1600, height: 900 })) as HTMLCanvasElement[];
    await composeStrip(photos, {
      title: 'Styled Event', dateText: '15 August 2026', bottomText,
      hashtag: undefined, logoUrl: footerUrl, templateUrl,
      backgroundMode: templateUrl ? 'template' : 'colour', showBranding: false,
      style: {
        bgColor: '#967A59', nameFontFamily: 'Playfair Display', dateFontFamily: 'Manrope',
        nameColor: '#D7263D', dateColor: '#16A34A', nameSize: 58, dateSize: 34, textBackdrop,
      },
    });
    return harness;
  };

  it.each([null, 'https://storage.test/library-template.jpg', 'https://storage.test/custom-template.jpg'])(
    'applies the same saved generated-footer styling over background %s',
    async (templateUrl) => {
      const { text } = await render({ templateUrl });
      const heading = text.filter(record => record.text === 'Styled Event');
      const date = text.filter(record => record.text === '15 August 2026');
      expect(heading).toHaveLength(2);
      expect(date).toHaveLength(2);
      expect(heading.every(record => record.font.includes('58px') && record.font.includes('Playfair Display') && record.fillStyle === '#D7263D')).toBe(true);
      expect(date.every(record => record.font.includes('34px') && record.font.includes('Manrope') && record.fillStyle === '#16A34A')).toBe(true);
    },
  );

  it('preserves multiline custom text and the separate header/date style roles', async () => {
    const { text } = await render({ templateUrl: 'https://storage.test/library-template.jpg', bottomText: 'First line\nSecond line\nThird line' });
    expect(text.filter(record => record.text === 'First line')).toHaveLength(2);
    expect(text.filter(record => record.text === 'Second line')).toHaveLength(2);
    expect(text.filter(record => record.text === 'Third line')).toHaveLength(2);
    expect(text.find(record => record.text === 'First line')?.font).toContain('Playfair Display');
    expect(text.find(record => record.text === 'Second line')?.font).toContain('Manrope');
  });

  it.each([
    ['none', 0],
    ['white', 12],
    ['black', 12],
  ] as const)('renders %s as one wide rectangular backdrop per footer column', async (mode, expectedFills) => {
    const { context } = await render({ templateUrl: 'https://storage.test/library-template.jpg', textBackdrop: mode });
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalledTimes(expectedFills);
    if (mode !== 'none') {
      expect(PB_FOOTER_BACKDROP_CORNER_RADIUS).toBeLessThan(FOOTER_PANEL_HEIGHT / 4);
      expect(PB_FOOTER_BACKDROP_MIN_WIDTH_RATIO).toBeGreaterThanOrEqual(0.7);
      const footerTop = PB_STRIP_PRINT.h - FOOTER_PANEL_HEIGHT + FOOTER_PANEL_SAFE_INSET;
      const footerBottom = PB_STRIP_PRINT.h - FOOTER_PANEL_SAFE_INSET;
      const backdropStarts = context.moveTo.mock.calls.filter(([, y]) => y >= footerTop && y <= footerBottom);
      expect(backdropStarts).toHaveLength(expectedFills);
      expect(backdropStarts.some(([x]) => x < PB_STRIP_SINGLE.w)).toBe(true);
      expect(backdropStarts.some(([x]) => x > PB_STRIP_SINGLE.w)).toBe(true);
    }
  });

  it('uses the lighter Wedding Waitress brown for initial and fallback strip settings', () => {
    expect(PB_CANONICAL_BACKGROUND).toBe('#967A59');
    expect(PB_DEFAULT_STYLE.bgColor).toBe('#967A59');
    expect(resolveStripStyle(null).bgColor).toBe('#967A59');
    expect(resolveStripStyle({ bgColor: '' }).bgColor).toBe('#967A59');
  });

  it('draws a complete custom footer twice above the template/photos and suppresses generated text and backdrop', async () => {
    const { context, text } = await render({
      templateUrl: 'https://storage.test/library-template.jpg',
      footerUrl: 'https://storage.test/custom-footer.jpg',
      textBackdrop: 'black',
    });
    expect(text.some(record => record.text === 'Styled Event' || record.text === '15 August 2026')).toBe(false);
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    const footerCalls = context.drawImage.mock.calls.filter(call => call.slice(1).join(',') === `0,1544,600,256` || call.slice(1).join(',') === `600,1544,600,256`);
    expect(footerCalls).toHaveLength(2);
    const callIndexes = footerCalls.map(call => context.drawImage.mock.calls.indexOf(call));
    expect(callIndexes[0]).toBeGreaterThan(4);
    expect(callIndexes[1]).toBeGreaterThan(callIndexes[0] + 4);
    expect(context.drawImage.mock.calls.at(-1)).toEqual(footerCalls[1]);
  });

  it('defaults old settings to no backdrop while retaining a persisted selection', () => {
    expect(resolveStripStyle(null).textBackdrop).toBe('none');
    expect(resolveStripStyle({ textBackdrop: 'white' }).textBackdrop).toBe('white');
    expect(resolveStripStyle({ textBackdrop: 'black' }).textBackdrop).toBe('black');
    expect(resolveStripStyle({ textBackdrop: 'invalid' as never }).textBackdrop).toBe('none');
  });
});
