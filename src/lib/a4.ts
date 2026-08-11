export const A4_MM = {
  width: 210,
  height: 297,
} as const;

export const MM_PER_INCH = 25.4;
export const CSS_DPI = 96;

export const A4_PX = {
  width: Math.round((A4_MM.width / MM_PER_INCH) * CSS_DPI),
  height: Math.round((A4_MM.height / MM_PER_INCH) * CSS_DPI),
} as const;

export const A4_ASPECT_RATIO = A4_MM.width / A4_MM.height;

export const A4_PAGE_STYLE = {
  width: `${A4_MM.width}mm`,
  height: `${A4_MM.height}mm`,
} as const;
