# Seating Chart Signs local QA — 5 September 2026

Review: http://localhost:8080/dashboard?tab=signage

## Scope and preserved state

Worked on the existing Signs editor and its shared renderer through optional Signs configuration. Preserved existing uncommitted work, interface colours/fonts/styling, the user's Eiffel Tower Brown Elegant background, Wendy & Tom's wedding, the sample guests and six tables. No push, deployment or migration.

Localhost uses shared hosted Supabase project `xytxkidpourwdbzzwcdp`. Saved-data checks used only the authorised test event `a5a944e6-b909-44d8-b1e8-669247fbcddb`. The isolated uploaded PNG was removed after testing. Temporary custom text and notes were cleared. Four sample preset text zones and the original QR placement remain.

## Fixes

- Kept the original full-size A4 preview (210 × 297 mm; approximately 794 × 1123 CSS pixels at 100%). Print-size choices never change that display. Existing tablet scaling and mobile pan/zoom remain.
- Template and uploaded background images use contain fitting, preserving their aspect ratio and complete image.
- PDF captures the visible A4 document instead of rebuilding separate text/QR markup. Fonts, background opacity, placement and transforms now share the preview renderer. Bounded 300-DPI tiles support large paper sizes.
- The owner explicitly requested an A4 display with separate paper choices. Exports therefore fit that same composition proportionally and centrally onto each selected sheet; different aspect ratios have margins.
- Autosave now combines rapid field edits, serialises writes, flushes pending changes on unmount and reports failed saves. Failed patches are retained for the next retry.
- Connected the existing Notes / Caption field and reset action to saved signage notes.
- New uploads enable the image layer and clear stale print-master references. Save failures no longer produce upload/removal/background-reset success messages.
- Zero opacity remains zero in both preview and its control. Normal text style displays Default instead of an empty selector.
- Hiding a QR retains its show switch. Export stops with an actionable error if an enabled QR is not ready.

## Verification

- Local production build passed. Existing Browserslist age and large-chunk warnings remain.
- 67 tests passed across 8 files: Signs runtime, tabs, typography, gallery and bulk-upload suites; signage autosave; signage paper/clone geometry; protected Individual Table Charts A4 regression suite.
- Interactive Chrome: four tabs, preset/custom text creation, content, font, font size, colour, bold/italic/underline, alignment, text case, resizing, rotation, duplication, reset and deletion; saved database values checked.
- QR show/hide, movement, resizing, reset and deletion checked, then original configuration restored.
- Image upload, removal, background reset, 0% opacity, invalid file type and >5 MB rejection checked. User's template restored and test upload removed.
- Notes saved and reset. Template library loaded 355 designs; search filtered Eiffel templates; View opened successfully.
- All eight paper choices selected through the UI; each retained a 793.6875 × 1122.515625 px A4 display on desktop.
- Desktop 1440 × 1000 and 1920 × 1080, tablet 820 × 1180, mobile 390 × 844 checked. No page-wide horizontal overflow. Mobile internal panning moved the artwork without changing its intrinsic geometry.
- Actual download button produced an A4 PDF. Its rendered comparison passed with 0.00718% different pixels (default limit 0.25%). The rendered PDF was visually inspected.
- Every supported output was generated, its PDF dimensions checked, rendered, normalised to the complete A4 artwork and compared using the repository mirror comparator. All passed:

| Output | PDF dimensions, mm | Different pixels, % |
| --- | --- | --- |
| A1 | 594 × 841 | 0.01110 |
| A2 | 420 × 594 | 0.00561 |
| A3 | 297 × 420 | 0.00942 |
| A4 | 210 × 297 | 0.00718 |
| A5 | 148 × 210 | 0.00785 |
| DL | 99 × 210 | 0.00841 |
| Postcard | 105 × 148 | 0.07884 |
| Business Card | 90 × 55 | 0.01907 |

- QR decoded from both the white-backed preview image and rendered A4 PDF to `https://weddingwaitress.com.au/qr/9YT9SI`.
- Final browser checks reported no runtime errors. Temporary automation script errors were corrected before rerunning the affected checks; they were not application failures.

Local comparison images, responsive screenshots and JSON measurements are under `%TEMP%/ww-signage-qa/`.

## Limits

Physical printer output, print-shop finishing and real phone scanning of each physical paper size were not tested. The existing business-card option scales the QR down with the whole composition; physical scan distance depends on print quality and size. Shared administrator gallery upload/delete/categorisation were covered by existing focused tests, not destructive writes against the shared live library. Canva's external editor was not changed or exercised. These are not claims of physical-print or shared-library write verification.
