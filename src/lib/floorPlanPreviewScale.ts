/** Screen presentation only. Share/admin views keep the original size cap. */
export const floorPlanPreviewWidthScale = (availableWidth: number, sheetWidth: number, expandDesktop: boolean, viewportWidth: number): number => {
  const ratio = availableWidth / sheetWidth;
  return expandDesktop && viewportWidth >= 1280 ? ratio : Math.min(1, ratio);
};
