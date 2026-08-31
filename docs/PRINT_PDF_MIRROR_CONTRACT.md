# Preview–Print–PDF Mirror Contract

This rule applies to every Wedding Waitress feature that shows a printable document preview.

The visible preview, browser print output, and downloaded PDF must come from one authoritative document renderer with the same data, DOM/component structure, intrinsic paper dimensions, typography, line heights, wrapping, spacing, colours, and geometry. A PDF is not a separately designed screen.

## Required architecture

- Mount one authoritative document for ordinary preview use. Do not keep a second hidden export layout mounted.
- Keep paper geometry fixed in physical units. Responsive UI may only scale or scroll an external wrapper; it must never reflow the document.
- Export the visible document reference or a transient exact clone of it.
- Wait for fonts and images only after the user starts an export.
- Export-clone handling may remove external scale, transform origin, paper border, and paper shadow. It must not change internal font, wrapping, width, height, padding, margin, gap, grid, flex, overflow, alignment, position, or transforms.
- Preview changes must automatically flow into PDF output. PDF fixes must be made in the authoritative renderer.

The typed repository declaration and permitted presentation properties live in `src/lib/printPdfMirrorContract.ts`. Ceremony exporters must call its document-reference and intrinsic-size assertion before capture.

## Ceremony contract

`CeremonyFloorPlanA4` is the sole Ceremony printable renderer. It remains exactly 297 × 210 mm, landscape. `ceremonyA4Ref` references the mounted renderer; `CeremonyFloorPlanA4Preview` scales only its external presentation wrapper. `ceremonyFloorPlanPdfExporter` captures that reference and uses one 297 × 210 mm PDF page. Browser Print marks and reveals that same referenced node.

The renderer carries `data-print-mirror-document="ceremony-floor-plan"`. The external scale wrapper carries `data-print-mirror-presentation="true"`. Do not move responsive styles inside the document.

## Visual mirror regression workflow

Use a deterministic fixture and freeze its generated timestamp.

1. Render the authoritative document at intrinsic size.
2. Generate the PDF from that exact document reference.
3. Render PDF page one back to PNG through PDF.js.
4. Normalise preview and PDF images to identical dimensions.
5. Compare their RGBA buffers with `verifyPrintPdfMirror` / `comparePrintMirrorPixels` from `src/lib/printPdfVisualMirror.ts`.
6. The default tolerance permits channel differences up to 12, a two-pixel spatial allowance, and no more than 0.25% meaningfully different pixels. Chroma and geometry must still match, so wrapping, clipping, missing content, or solid colour changes fail while PDF raster antialiasing does not create false positives.
7. Save the two normalised images and a difference image as CI artifacts when an end-to-end runner reports a failure.
8. Open and inspect the actual PDF manually. A task is not complete merely because automated tests pass.

For Ceremony use `createCeremonyPreviewPdf`, pass its PDF blob and the same `ceremonyA4Ref.current` to `verifyPrintPdfMirror`, and use `prepareCeremonyPdfClone` for both captures. Test the maximum 167-person fixture on PC, tablet, and mobile wrappers; the inner image dimensions must remain identical.

## Repository audit — 20 August 2026

The full typed audit is `PRINT_PDF_MIRROR_DECLARATIONS` in `src/lib/printPdfMirrorContract.ts`.

| Feature | Audit result | Architecture |
| --- | --- | --- |
| Ceremony Floor Plan | Compliant | One mounted `CeremonyFloorPlanA4` document reference |
| Individual Table Charts | Compliant and protected | Preview and transient export use `IndividualTableChartPrintPage` |
| Dietary Requirements | Protected exception | Visible A4 DOM is captured, but approved clone-only text offsets remain; do not change without explicit approval |
| Full Seating Chart | Audited violation | Preview DOM and manual jsPDF layout are separate implementations |
| Reception Floor Plan | Audited violation | Interactive canvas and vector jsPDF layout are separate implementations |
| Seating Chart Signs | Audited violation | Exporter rebuilds a separate overlay DOM for large-format performance |
| Invitations and Cards | Audited violation | Preview and transient export element use separate construction paths |
| Name Place Cards | Audited violation | Visible preview and a permanently mounted hidden print collection coexist |
| Run Sheet | No fixed-paper preview | Programmatic PDF only; enforce this contract if a paper preview is introduced |
| DJ & MC Questionnaire | No fixed-paper preview | Programmatic PDF only; enforce this contract if a paper preview is introduced |

Do not “clean up” an audited violation by changing an approved output in an unrelated task. First add a shared authoritative renderer and visual baselines, then migrate preview and export together under explicit product approval.
