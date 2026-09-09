/**
 * Preview–Print–PDF Mirror Contract
 *
 * Printable geometry belongs to an authoritative renderer. Responsive wrappers
 * may scale or scroll that renderer, and capture clones may remove only those
 * external presentation effects. See docs/PRINT_PDF_MIRROR_CONTRACT.md.
 */

export type PrintPaperOrientation = 'portrait' | 'landscape';
export type PrintMirrorStatus = 'compliant' | 'audited-violation' | 'protected-exception' | 'not-fixed-preview';

export interface PrintPdfMirrorDeclaration {
  id: string;
  feature: string;
  authoritativeRenderer: string;
  documentReference: string;
  intrinsicPaper: string;
  orientation: PrintPaperOrientation | 'variable';
  captureSource: string;
  pdfPageSize: string;
  permittedPresentationStyles: readonly string[];
  status: PrintMirrorStatus;
  auditNote: string;
}

export interface DomPrintPdfMirrorContract {
  id: string;
  selector: string;
  widthMm: number;
  heightMm: number;
  orientation: PrintPaperOrientation;
}

export const MIRROR_PRESENTATION_STYLE_PROPERTIES = [
  'transform',
  'transform-origin',
  'border',
  'box-shadow',
] as const;

export const CEREMONY_PRINT_MIRROR_CONTRACT: DomPrintPdfMirrorContract = {
  id: 'ceremony-floor-plan',
  selector: '[data-print-mirror-document="ceremony-floor-plan"]',
  widthMm: 297,
  heightMm: 210,
  orientation: 'landscape',
};

export const RECEPTION_PRINT_MIRROR_CONTRACT: DomPrintPdfMirrorContract = {
  id: 'reception-floor-plan',
  selector: '[data-print-mirror-document="reception-floor-plan"]',
  widthMm: 297,
  heightMm: 210,
  orientation: 'landscape',
};

export const EVENT_BUDGET_PRINT_MIRROR_CONTRACT: DomPrintPdfMirrorContract = {
  id: 'event-budget',
  selector: '[data-print-mirror-document="event-budget"]',
  widthMm: 297,
  heightMm: 210,
  orientation: 'landscape',
};

/**
 * Repository audit. `audited-violation` entries are intentionally declarations,
 * not silent claims of parity. Their approved output must not be redesigned as
 * part of an unrelated mirror-contract change.
 */
export const PRINT_PDF_MIRROR_DECLARATIONS: readonly PrintPdfMirrorDeclaration[] = [
  {
    id: 'event-budget', feature: 'Event Budget Planner',
    authoritativeRenderer: 'EventBudgetPrintDocument', documentReference: 'printRootRef',
    intrinsicPaper: '297 × 210 mm', orientation: 'landscape',
    captureSource: 'visible authoritative preview pages', pdfPageSize: 'A4 landscape',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'Preview, browser Print and PDF consume the same paginated React renderer and intrinsic page geometry.',
  },
  {
    id: 'ceremony-floor-plan', feature: 'Ceremony Floor Plan',
    authoritativeRenderer: 'CeremonyFloorPlanA4', documentReference: 'ceremonyA4Ref',
    intrinsicPaper: '297 × 210 mm', orientation: 'landscape',
    captureSource: 'visible authoritative DOM node', pdfPageSize: 'A4 landscape',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'One mounted renderer; export captures the referenced document and only neutralises its external preview wrapper.',
  },
  {
    id: 'individual-table-charts', feature: 'Individual Table Charts',
    authoritativeRenderer: 'IndividualTableChartPrintPage', documentReference: 'shared React renderer',
    intrinsicPaper: '210 × 297 mm', orientation: 'portrait',
    captureSource: 'same authoritative component rendered transiently for each page', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'Protected approved baseline; preview and transient export use the same print-page component.',
  },
  {
    id: 'dietary-requirements', feature: 'Dietary Requirements',
    authoritativeRenderer: 'KitchenDietaryChart A4 page markup', documentReference: 'a4PreviewRef',
    intrinsicPaper: '210 × 297 mm', orientation: 'portrait',
    captureSource: 'visible A4 DOM page with protected clone text offsets', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'protected-exception', auditNote: 'Known export-clone text nudges conflict with the strict contract; owner explicitly protected the approved offsets from this task.',
  },
  {
    id: 'full-seating-chart', feature: 'Full Seating Chart',
    authoritativeRenderer: 'FullSeatingChartPreview plus manual jsPDF drawing', documentReference: 'settings/data',
    intrinsicPaper: '210 × 297 mm', orientation: 'portrait',
    captureSource: 'separately maintained jsPDF geometry', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'audited-violation', auditNote: 'Dashboard now captures FullSeatingChartPreview for PDF and browser print; legacy public-view drawing exporter remains separate.',
  },
  {
    id: 'reception-floor-plan', feature: 'Reception Floor Plan',
    authoritativeRenderer: 'ReceptionFloorPlanA4', documentReference: 'receptionA4Ref',
    intrinsicPaper: '297 × 210 mm', orientation: 'landscape',
    captureSource: 'visible authoritative DOM node', pdfPageSize: 'A4 landscape',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'One mounted interactive renderer; export captures the referenced visible A4 and only neutralises external presentation styles.',
  },
  {
    id: 'seating-chart-signs', feature: 'Seating Chart Signs',
    authoritativeRenderer: 'InvitationCardPreview', documentReference: 'signDocumentRef',
    intrinsicPaper: 'Selected A0/A1/A2/A3 dimensions in mm', orientation: 'portrait',
    captureSource: 'visible authoritative DOM node', pdfPageSize: 'same selected paper dimensions as preview',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'Owner approved A0/A1/A2/A3 with matching preview and PDF geometry. The selected paper is rendered once; edge-to-edge image fitting and proportional typography are visible before export. PDF captures that same document without export-only fitting. Preview zoom affects external presentation only.',
  },
  {
    id: 'invitations-cards', feature: 'Invitations and Cards',
    authoritativeRenderer: 'InvitationCardPreview', documentReference: 'previewDocumentRef',
    intrinsicPaper: 'A4/A5/A6', orientation: 'variable',
    captureSource: 'visible authoritative card DOM', pdfPageSize: 'selected card size',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'The Invitations and Cards page captures its visible A4/A5/A6 renderer; only external preview transforms and shadows are neutralised.',
  },
  {
    id: 'name-place-cards', feature: 'Name Place Cards',
    authoritativeRenderer: 'PlaceCardPreview', documentReference: 'previewRef (single visible page)',
    intrinsicPaper: '210 × 297 mm', orientation: 'portrait',
    captureSource: 'visible authoritative card sheet; paginate and restore for all-page export', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'compliant', auditNote: 'One 210 × 297 mm sheet serves preview, browser print and PDF. Front, back, full, decorative and plain rendered PDF comparisons passed on 5 September 2026.',
  },
  {
    id: 'running-sheet', feature: 'Run Sheet',
    authoritativeRenderer: 'data-driven screen and programmatic PDF', documentReference: 'run-sheet data',
    intrinsicPaper: 'flowing pages', orientation: 'portrait',
    captureSource: 'programmatic PDF document', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'not-fixed-preview', auditNote: 'No fixed paper preview is presented to the user; strict visual mirroring becomes mandatory if one is added.',
  },
  {
    id: 'dj-mc-questionnaire', feature: 'DJ & MC Questionnaire',
    authoritativeRenderer: 'data-driven screen and programmatic PDF', documentReference: 'questionnaire data',
    intrinsicPaper: 'flowing pages', orientation: 'portrait',
    captureSource: 'programmatic PDF document', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'not-fixed-preview', auditNote: 'No fixed paper preview is presented to the user; strict visual mirroring becomes mandatory if one is added.',
  },
] as const;

export const assertAuthoritativeMirrorDocument = (
  element: HTMLElement,
  contract: DomPrintPdfMirrorContract,
): void => {
  if (!element.matches(contract.selector)) {
    throw new Error(`Expected the authoritative ${contract.id} document reference.`);
  }
  const expectedWidthPx = contract.widthMm * 96 / 25.4;
  const expectedHeightPx = contract.heightMm * 96 / 25.4;
  if (Math.abs(element.offsetWidth - expectedWidthPx) > 2 || Math.abs(element.offsetHeight - expectedHeightPx) > 2) {
    throw new Error(`${contract.id} must remain ${contract.widthMm} × ${contract.heightMm} mm at its intrinsic geometry.`);
  }
};

/** Removes only the external scale/border/shadow used to present the paper. */
export const preparePrintMirrorClone = (
  clonedDocument: Document,
  contract: DomPrintPdfMirrorContract,
): void => {
  const clonedPage = clonedDocument.querySelector<HTMLElement>(contract.selector);
  if (!clonedPage) return;
  const presentation = clonedPage.closest<HTMLElement>('[data-print-mirror-presentation="true"]');
  if (!presentation) return;
  presentation.style.transform = 'none';
  presentation.style.transformOrigin = 'top left';
  presentation.style.border = '0';
  presentation.style.boxShadow = 'none';
};
