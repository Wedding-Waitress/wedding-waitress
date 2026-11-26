/** Keep every sign size at the owner-approved A1-at-36% editor width.
 * This is presentation only: PDF paper dimensions remain selected independently. */
export const SIGNAGE_PREVIEW_WIDTH_MM=594*0.36;
export function signagePreviewWidthMm(availableWidthPx:number){
 return availableWidthPx>0?Math.min(SIGNAGE_PREVIEW_WIDTH_MM,availableWidthPx*25.4/96):SIGNAGE_PREVIEW_WIDTH_MM;
}
