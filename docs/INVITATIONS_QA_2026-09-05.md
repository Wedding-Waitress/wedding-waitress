# Invitations & Cards QA — 5 September 2026

Scope: localhost `/dashboard?tab=invitations`; preserve the existing invitation and other pages. No deployment or push.

## Approved changes

- Matching Seating Chart Signs designer controls: borderless tabs, selected embossed green pill with white text/icons, transparent heading, green Add Custom Text Zone (brown plus), green Reset, white delete icons including their SVG paths, dark Template Library text.
- A4 (210 × 297 mm) / A5 (148 × 210 mm) for invitations and save-the-dates, A5 default. A6 (105 × 148 mm) only for new thank-you cards. Existing artwork is not resized automatically. Top size choices affect the active card, or the next new card if none is selected.
- Preview/PDF use InvitationCardPreview and previewDocumentRef. 300 DPI exporter captures the actual document and only neutralises external preview transforms/shadows. QR white plate, image crop approval, fit-to-width preview and stable zoom match Signs behavior.
- Save queue coalesces fields, isolates card IDs, serialises requests, flushes on leaving, and returns actual save failures. Notes now persist per card. Switching card types no longer leaves an unrelated card visible.
- Successful upload/reset/gallery messages are suppressed if saving fails. Hidden QR remains available to show again. Creation dialogs remain open on failure.

## Approved database correction

Existing hosted project: `xytxkidpourwdbzzwcdp`.
User explicitly approved the reviewed correction and per-card notes. Replaced `invitation_card_settings_event_user_idx` with a non-unique index on the same columns, and added `notes text NOT NULL DEFAULT ''`. No existing rows deleted; RLS remains enabled and ownership policies unchanged. No migration-history entry created. SQL is recorded in `INVITATIONS_DATABASE_CORRECTION_REVIEW.sql`.

## Browser verification

Only temporary QA artworks under Wendy & Tom's test event were mutated. The original invitation was compared field-by-field with the pre-test snapshot and remained unchanged.

Passed: A5 invitation creation; all seven presets and custom text; text editing; font family/size/style/colour/alignment/case; delete zone and add back; text reset; notes save/reload/reset; uploaded background; opacity 0% and 70%; library search/view/select; mismatched-image cancel/approve; A4/A5 size change with crop cancellation; QR event choice/hide/show; preview dragging; stable zoom; duplicate with preserved content/notes; rename; Save the Date A5 and Thank You A6 creation; card-delete cancel and confirmation.

Desktop 1920, tablet 820 and mobile 390 browser checks passed with no page-level horizontal overflow. Temporary QA cards and the two test uploads were removed, leaving the original card.

## Print evidence

Six rendered-PDF comparisons at 300 DPI passed: A4/A5/A6, portrait and landscape. Maximum differing-pixel ratio was 0.22344%, within the existing 0.25% tolerance (unchanged).

The actual downloaded A5 PDF was also rendered and compared with the live preview: 0.14416% differing pixels, passed; file size 146,316 bytes. Rendered PDF visually inspected. Artifacts reside in the session temporary directory `ww-signage-qa`, including `inv-pdf-matrix.json`, six preview/PDF pairs, and `inv-actual-download.png`.

Physical printer output, paper trimming and colour calibration were not verified. Shared production template-library admin upload/categorise/delete actions were not exercised; no shared templates were altered. Sending email/SMS is not exposed by this mounted page and no messages were sent.

## Final verification

- 94 tests across 16 suites passed, including Invitations, saving/size/export tests, Seating Chart Signs regressions and the protected Individual Table Charts suite.
- Local production build passed (29.61 seconds); existing bundle-size/Browserslist warnings remain.
- Final browser check confirmed the original A4 card, no QA cards, transparent designer heading, borderless tabs and the approved green active pill.
