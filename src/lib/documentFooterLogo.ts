/** Exact supplied PNG. Contain it within each exporter's existing footer box. */
export const DOCUMENT_FOOTER_LOGO_ASPECT_RATIO = 17412 / 4205;
export const fitDocumentFooterLogo = (boxWidth: number, boxHeight: number) => {
  const width = Math.min(boxWidth, boxHeight * DOCUMENT_FOOTER_LOGO_ASPECT_RATIO);
  return { width, height: width / DOCUMENT_FOOTER_LOGO_ASPECT_RATIO };
};
