export const CEREMONY_A4 = {
  widthMm: 297,
  heightMm: 210,
  paddingTopMm: 8,
  paddingInlineMm: 10,
  paddingBottomMm: 9,
  headerHeightMm: 25,
  footerHeightMm: 12,
  bridalPartyHeightMm: 38,
  aisleWidthMm: 18,
} as const;

export const CEREMONY_A4_PAGE_STYLE = {
  width: `${CEREMONY_A4.widthMm}mm`,
  height: `${CEREMONY_A4.heightMm}mm`,
} as const;

export const CEREMONY_A4_ASPECT_RATIO = CEREMONY_A4.widthMm / CEREMONY_A4.heightMm;

export interface CeremonyA4LayoutInput {
  chairsPerRow: number;
  totalRows: number;
}

export interface CeremonyA4Layout {
  seatWidthMm: number;
  seatHeightMm: number;
  seatGapMm: number;
  rowGapMm: number;
}

/** Deterministic printable geometry; viewport size never affects document layout. */
export const getCeremonyA4Layout = ({ chairsPerRow, totalRows }: CeremonyA4LayoutInput): CeremonyA4Layout => {
  const safeChairs = Math.max(1, Math.min(6, chairsPerRow));
  const safeRows = Math.max(1, Math.min(12, totalRows));
  const usableWidthMm = CEREMONY_A4.widthMm - (CEREMONY_A4.paddingInlineMm * 2) - CEREMONY_A4.aisleWidthMm - 12;
  const sideWidthMm = usableWidthMm / 2;
  const seatGapMm = 1;
  const seatWidthMm = Math.min(17.5, (sideWidthMm - ((safeChairs - 1) * seatGapMm)) / safeChairs);
  const seatingHeightMm = CEREMONY_A4.heightMm
    - CEREMONY_A4.paddingTopMm
    - CEREMONY_A4.paddingBottomMm
    - CEREMONY_A4.headerHeightMm
    - CEREMONY_A4.footerHeightMm
    - CEREMONY_A4.bridalPartyHeightMm
    - 9;
  const rowGapMm = 0.8;
  const seatHeightMm = Math.min(8.4, (seatingHeightMm - ((safeRows - 1) * rowGapMm)) / safeRows);

  return { seatWidthMm, seatHeightMm, seatGapMm, rowGapMm };
};

