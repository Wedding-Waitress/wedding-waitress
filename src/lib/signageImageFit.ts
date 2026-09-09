export interface SignPaper { label: string; widthMm: number; heightMm: number; }

/** Source-image percentages retained by the same CSS cover fitting used in the sign. */
export function signageImageCrop(imageWidth: number, imageHeight: number, paper: SignPaper, x = 50, y = 50) {
  if (![imageWidth, imageHeight, paper.widthMm, paper.heightMm].every(n => Number.isFinite(n) && n > 0)) throw new Error('Image and paper dimensions must be positive.');
  const scale = Math.max(paper.widthMm / imageWidth, paper.heightMm / imageHeight);
  const width = paper.widthMm / scale / imageWidth * 100;
  const height = paper.heightMm / scale / imageHeight * 100;
  return { width, height, left: (100 - width) * x / 100, top: (100 - height) * y / 100, needsApproval: width * height / 10000 < 0.998 };
}
