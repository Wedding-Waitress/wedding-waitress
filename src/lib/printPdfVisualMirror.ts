export interface PrintMirrorPixelOptions {
  channelTolerance?: number;
  maximumDifferentPixelRatio?: number;
  imageWidth?: number;
  spatialTolerancePx?: number;
}

export interface PrintMirrorPixelResult {
  passed: boolean;
  differentPixels: number;
  differentPixelRatio: number;
  maximumChannelDelta: number;
}

export interface VerifyPrintPdfMirrorOptions {
  documentElement: HTMLElement;
  pdfBlob: Blob;
  contract: DomPrintPdfMirrorContract;
  captureScale?: number;
  prepareClone?: (clonedDocument: Document) => void;
  pixelOptions?: PrintMirrorPixelOptions;
}

export interface VerifyPrintPdfMirrorResult extends PrintMirrorPixelResult {
  width: number;
  height: number;
  previewCanvas: HTMLCanvasElement;
  renderedPdfCanvas: HTMLCanvasElement;
}

/**
 * Rendering engines can differ by a few antialiasing values. Geometry, wrapping,
 * clipping, or missing content changes affect coherent pixel regions and exceed
 * this deliberately small tolerance.
 */
export const comparePrintMirrorPixels = (
  preview: Uint8ClampedArray,
  renderedPdf: Uint8ClampedArray,
  options: PrintMirrorPixelOptions = {},
): PrintMirrorPixelResult => {
  if (preview.length !== renderedPdf.length || preview.length % 4 !== 0) {
    throw new Error('Mirror images must have identical RGBA dimensions.');
  }
  const channelTolerance = options.channelTolerance ?? 12;
  const maximumDifferentPixelRatio = options.maximumDifferentPixelRatio ?? 0.0025;
  const imageWidth = options.imageWidth;
  const spatialTolerancePx = imageWidth ? (options.spatialTolerancePx ?? 2) : 0;
  const totalPixels = preview.length / 4;
  const imageHeight = imageWidth ? totalPixels / imageWidth : 0;
  let maximumChannelDelta = 0;

  const perceptualInkMatch = (
    source: Uint8ClampedArray,
    sourceIndex: number,
    target: Uint8ClampedArray,
    targetIndex: number,
  ): boolean => {
    const sourceStrength = Math.max(255 - source[sourceIndex], 255 - source[sourceIndex + 1], 255 - source[sourceIndex + 2]);
    const targetStrength = Math.max(255 - target[targetIndex], 255 - target[targetIndex + 1], 255 - target[targetIndex + 2]);
    if (sourceStrength <= 18 || targetStrength <= 18) return sourceStrength <= 18 && targetStrength <= 18;
    for (let channel = 0; channel < 3; channel += 1) {
      const sourceChroma = (255 - source[sourceIndex + channel]) / sourceStrength;
      const targetChroma = (255 - target[targetIndex + channel]) / targetStrength;
      if (Math.abs(sourceChroma - targetChroma) > 0.2) return false;
    }
    return true;
  };

  const directionalDifferenceCount = (source: Uint8ClampedArray, target: Uint8ClampedArray): number => {
    let count = 0;
    for (let index = 0; index < source.length; index += 4) {
      let pixelDelta = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(source[index + channel] - target[index + channel]);
        pixelDelta = Math.max(pixelDelta, delta);
        maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      }
      if (pixelDelta <= channelTolerance || perceptualInkMatch(source, index, target, index)) continue;
      if (spatialTolerancePx > 0 && imageWidth && Number.isInteger(imageHeight)) {
        const pixel = index / 4;
        const x = pixel % imageWidth;
        const y = Math.floor(pixel / imageWidth);
        let spatialMatch = false;
        for (let offsetY = -spatialTolerancePx; offsetY <= spatialTolerancePx && !spatialMatch; offsetY += 1) {
          const targetY = y + offsetY;
          if (targetY < 0 || targetY >= imageHeight) continue;
          for (let offsetX = -spatialTolerancePx; offsetX <= spatialTolerancePx; offsetX += 1) {
            const targetX = x + offsetX;
            if (targetX < 0 || targetX >= imageWidth) continue;
            const targetIndex = ((targetY * imageWidth) + targetX) * 4;
            let neighbourDelta = 0;
            for (let channel = 0; channel < 4; channel += 1) {
              neighbourDelta = Math.max(neighbourDelta, Math.abs(source[index + channel] - target[targetIndex + channel]));
            }
            if (neighbourDelta <= channelTolerance || perceptualInkMatch(source, index, target, targetIndex)) { spatialMatch = true; break; }
          }
        }
        if (spatialMatch) continue;
      }
      count += 1;
    }
    return count;
  };

  const differentPixels = Math.max(
    directionalDifferenceCount(preview, renderedPdf),
    directionalDifferenceCount(renderedPdf, preview),
  );
  const differentPixelRatio = totalPixels === 0 ? 0 : differentPixels / totalPixels;
  return {
    passed: differentPixelRatio <= maximumDifferentPixelRatio,
    differentPixels,
    differentPixelRatio,
    maximumChannelDelta,
  };
};

const blobToImage = async (blob: Blob): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Browser visual-regression workflow:
 * 1. capture the intrinsic authoritative document;
 * 2. render page one of the actual PDF through PDF.js;
 * 3. normalise both bitmaps to identical dimensions;
 * 4. compare their RGBA pixels with the documented raster tolerance.
 */
export const verifyPrintPdfMirror = async ({
  documentElement,
  pdfBlob,
  contract,
  captureScale = 3,
  prepareClone,
  pixelOptions,
}: VerifyPrintPdfMirrorOptions): Promise<VerifyPrintPdfMirrorResult> => {
  assertAuthoritativeMirrorDocument(documentElement, contract);
  const [{ default: html2canvas }, { pdfFirstPageToPng }] = await Promise.all([
    import('html2canvas'),
    import('./pdfFirstPageToPng'),
  ]);
  const previewCanvas = await html2canvas(documentElement, {
    backgroundColor: '#ffffff',
    scale: captureScale,
    useCORS: true,
    logging: false,
    width: documentElement.offsetWidth,
    height: documentElement.offsetHeight,
    windowWidth: documentElement.offsetWidth,
    windowHeight: documentElement.offsetHeight,
    onclone: prepareClone,
  });

  // PDF points use 72 DPI; CSS millimetres use 96 DPI.
  const renderedPdfBlob = await pdfFirstPageToPng(
    new File([pdfBlob], `${contract.id}-mirror.pdf`, { type: 'application/pdf' }),
    captureScale * (96 / 72),
  );
  const renderedImage = await blobToImage(renderedPdfBlob);
  const renderedPdfCanvas = document.createElement('canvas');
  renderedPdfCanvas.width = previewCanvas.width;
  renderedPdfCanvas.height = previewCanvas.height;
  const renderedContext = renderedPdfCanvas.getContext('2d', { willReadFrequently: true });
  const previewContext = previewCanvas.getContext('2d', { willReadFrequently: true });
  if (!renderedContext || !previewContext) throw new Error('Canvas 2D context unavailable for mirror verification.');
  renderedContext.drawImage(renderedImage, 0, 0, renderedPdfCanvas.width, renderedPdfCanvas.height);

  const comparison = comparePrintMirrorPixels(
    previewContext.getImageData(0, 0, previewCanvas.width, previewCanvas.height).data,
    renderedContext.getImageData(0, 0, renderedPdfCanvas.width, renderedPdfCanvas.height).data,
    { imageWidth: previewCanvas.width, spatialTolerancePx: 2, ...pixelOptions },
  );
  return {
    ...comparison,
    width: previewCanvas.width,
    height: previewCanvas.height,
    previewCanvas,
    renderedPdfCanvas,
  };
};
import type { DomPrintPdfMirrorContract } from './printPdfMirrorContract';
import { assertAuthoritativeMirrorDocument } from './printPdfMirrorContract';
