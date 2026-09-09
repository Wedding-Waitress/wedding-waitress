# Protected feature baselines

## Preview–Print–PDF mirror contract

All printable document work must follow [docs/PRINT_PDF_MIRROR_CONTRACT.md](docs/PRINT_PDF_MIRROR_CONTRACT.md). A preview, browser print, and PDF must use one authoritative renderer and intrinsic geometry. Export-only code may neutralise external preview presentation, but must not alter document content or layout. Every printable change requires a rendered-PDF comparison; passing unit tests alone is not sufficient.

## Individual Table Charts

Treat the Individual Table Charts feature as an approved, protected baseline.

- Do not change its visual output or behaviour unless a future user prompt explicitly requests changes to this feature.
- Protected behaviour includes its exact A4 dimensions, browser-preview/PDF parity, Round/Square/Long Table layouts, seat distribution and geometry, typography, colours, footer, export controls, and PC/tablet/mobile rendering.
- Any change to shared A4, print, PDF-generation, or export code must preserve the Individual Table Charts page exactly.
- After any authorized change that could affect this feature, run its focused regression suite with `npx.cmd vitest run src/lib/individualTableChartA4.test.tsx` and keep the suite passing.

## Run Sheet shared-view consistency
- Changes to the main Run Sheet's schedule content, row controls, styling, and responsive layout must also be reflected in the shared Run Sheet. Reuse the shared components and theme; verify both views for applicable changes.
- Preserve recipient permissions: view-only links must remain read-only, and account navigation, event selection, and share management remain owner-only.


## Approved Run Sheet template
- Preserve the approved 13-row schedule in src/lib/runningSheetDefaults.ts as the single default for new Run Sheets and confirmed owner/shared resets. Keep its times, rich event descriptions, responsibilities, and row order unless the user requests a template change.
- Shared links display the same saved schedule. Do not replace customized schedules or intentionally blank rows with defaults on page load.


## Approved DJ and MC Questionnaire defaults
- The owner locked all nine section templates in `src/lib/djMCQuestionnaireTemplates.ts` as the approved default baseline on 8 September 2026. Preserve their labels, order, row labels, row counts, and field capabilities unless the owner explicitly requests a default-template change.
- The sections are Ceremony Music, Cocktail Hour Music, Bridal Party Introductions, Speeches, Main Events Songs, Background Dinner Music, Dance Music, Traditional/Multicultural Music, and Do Not Play List.
- Event-specific editing or deletion must never alter these source templates. Restore a missing default section from its template only when requested, without resetting other sections or guest submissions.
- Guest Song Requests is a separate guest-submission section; preserve its availability and do not treat submitted requests as default sample data.
- This baseline is not a backup of edited event data and does not guarantee Undo recovery. Do not describe it as such. Do not automatically repopulate intentionally deleted sections on fetch.

## Approved green action-button reference
- On 8 September 2026, the owner selected the DJ & MC Questionnaire top Export Controls buttons as the reference for future green Share, Save, Download, and similar action-button styling. Apply page by page when requested; this note does not authorise a site-wide restyle.
- Pill shape (fully rounded ends / rounded-full), minimum height 40px, automatic height for wrapped labels, padding 10px vertically and 16px horizontally; preserve responsive usability.
- Embossed green background: linear-gradient(180deg, #7bd880, #55a447); no border. Existing surface emboss/shadow: inset 0 1px 0 #ffffff80, inset 0 -2px 0 #37652d66, 0 4px 10px #426a2a30.
- Left icon: dark espresso #2f1b14, 16px, stroke width 1.8, NO icon drop shadow.
- Wording to its right: white, Manrope 14px semibold (600), text shadow 0 1px 2px rgba(0,0,0,.55). The label shadow must not be applied as a filter to the entire button or icon.
- Reference implementation: src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx and DJMCQuestionnaireTheme.module.css. Current export hover brightens slightly (brightness 1.04); separate Add Bottom Row hover is darker and must not be confused with this export reference.

## Popup form action order
- Owner approved on 8 September 2026: primary green Save/Create/confirm action goes to the left of Cancel in popup forms, matching Edit Event. On stacked mobile layouts keep primary before Cancel. Apply consistently when updating popup forms; preserve any separate destructive actions and existing behavior.

## Reset to Default button reference
- Owner approved: embossed red gradient #f85b53 to #d9342c, no border, white wording with text-only shadow 0 1px 2px rgba(0,0,0,.55), espresso #2f1b14 reset icon without shadow. Preserve current widths. Apply to Reset to Default controls page by page when requested.

## Export Controls heading reference
- Owner approved Event Budget as the reference across existing Export Controls panels on 8 September 2026: Manrope 14px semibold, 21px line height, espresso #2f1b14 text, left 16px printer icon in #806344, 6px icon gap, and 12px panel padding on every side.
- Use src/styles/exportControlsReference.css and the data-export-controls-heading / data-export-controls-panel attributes. Remove visible explanatory subheadings from these panels; preserve functional progress/error feedback and accessible descriptions.
- Budget's Print Budget and Download PDF buttons sit side by side in that order below its heading. Other action layouts remain page-specific.
