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
    status: 'audited-violation', auditNote: 'Preview DOM and PDF drawing commands are separate implementations; protected tests currently calibrate their parity.',
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
    authoritativeRenderer: 'sign preview plus signagePdfExporter overlay builder', documentReference: 'shared template data',
    intrinsicPaper: 'A1/A2/A3/A4/A5', orientation: 'variable',
    captureSource: 'separate export overlay DOM', pdfPageSize: 'selected print size',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'audited-violation', auditNote: 'Exporter rebuilds text/QR overlay separately for performance at large print sizes.',
  },
  {
    id: 'invitations-cards', feature: 'Invitations and Cards',
    authoritativeRenderer: 'InvitationPreview plus buildInvitationElement', documentReference: 'shared design options',
    intrinsicPaper: 'A4/A5/A6', orientation: 'variable',
    captureSource: 'transient separately built export element', pdfPageSize: 'selected card size',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'audited-violation', auditNote: 'Preview and export consume the same settings but use separate DOM construction paths.',
  },
  {
    id: 'name-place-cards', feature: 'Name Place Cards',
    authoritativeRenderer: 'PlaceCardPreview', documentReference: 'visible and print-page DOM collections',
    intrinsicPaper: '210 × 297 mm', orientation: 'portrait',
    captureSource: 'permanent hidden print DOM', pdfPageSize: 'A4 portrait',
    permittedPresentationStyles: MIRROR_PRESENTATION_STYLE_PROPERTIES,
    status: 'audited-violation', auditNote: 'A separate hidden print page collection remains mounted alongside the visible preview.',
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
