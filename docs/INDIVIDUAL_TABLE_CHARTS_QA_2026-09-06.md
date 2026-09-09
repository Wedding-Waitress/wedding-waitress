# Individual Table Charts review — 6 September 2026

Reviewed directly in the existing localhost Wedding Waitress app. No staging/test pages, database changes or deployment. Original Table 4 selection, Round shape, Standard text size, black colours, enabled display options and plain text restored.

## Corrections
- Browser-print CSS now reveals the exact A4 chart and header, removing only external preview scaling.
- Lossless PDF compression reduces the sampled single-page PDF from 24 MB to 247 KB; six-page export is about 1.15 MB. Export iframe clones are cleaned up.
- Capacity validation applies consistently before preview/single/all export: Round/Square up to 20, Long up to 42. Head tables retain their independent layout. All-page export checks every table before beginning.
- More than 12 Round/Square guests now use compact 8 pt diagram labels and separated label positions. Existing small-table geometry and guest-list text sizing remain unchanged. Rendered maximum-20 PDFs were inspected before/after: overlapping labels corrected.
- Head-table guest names now honour colour and text styles. Unavailable head/long controls are disabled with explanatory text. Corrected confusing explanatory copy and named shape/text-size controls for accessibility.
- Browser session storage failures no longer crash chart settings.

## Verification
- 50 focused tests passed across A4 renderer, typography/dropdowns and capacity checks.
- Live: all five switches, all 35 colour buttons, all three text sizes, independent and combined bold/italic/underline, Round/Square/Long, end-seat toggle, Head Table and empty table through all-page export.
- PC 1920×1080, tablet 820×1180, mobile 390×844. A4 intrinsic dimensions remain 210×297 mm; no horizontal page overflow. Responsive wrapping/scaling visually inspected.
- Actual PDF rendered comparisons: Round/Square/Long at mobile, tablet and desktop (tablet Long checked before final non-layout cleanup). Sample differences 0.0004735%, below the 0.25% tolerance. Browser-print CSS raster comparisons passed (zero materially different pixels).
- Maximum-capacity exports: 20 Round, 20 Square, 42 Long with end seats at Large text setting; actual rendered PDF images inspected.
- Six-page all-table PDF rendered and every page inspected; includes head and empty tables, correct table order/footer numbering, portrait A4.
- QA artifacts retained in the Codex task folder itc-review-artifacts. Temporary in-app export diagnostics removed.

## Limits
Device checks use browser viewport emulation, not physical tablet/phone hardware. Browser print stylesheet is checked through rendered print-media CSS; no physical printer was operated. PDF exports themselves were rendered with PDF.js. Head Table and Table 5 currently have no occupants in this event; that is event data, not a missing chart feature. Settings remain per-browser-tab session as designed. Existing renderer lint has two pre-existing any-type errors and React refresh warnings.
