# Protected feature baselines

## Preview–Print–PDF mirror contract

All printable document work must follow [docs/PRINT_PDF_MIRROR_CONTRACT.md](docs/PRINT_PDF_MIRROR_CONTRACT.md). A preview, browser print, and PDF must use one authoritative renderer and intrinsic geometry. Export-only code may neutralise external preview presentation, but must not alter document content or layout. Every printable change requires a rendered-PDF comparison; passing unit tests alone is not sufficient.

## Individual Table Charts

Treat the Individual Table Charts feature as an approved, protected baseline.

- Do not change its visual output or behaviour unless a future user prompt explicitly requests changes to this feature.
- Protected behaviour includes its exact A4 dimensions, browser-preview/PDF parity, Round/Square/Long Table layouts, seat distribution and geometry, typography, colours, footer, export controls, and PC/tablet/mobile rendering.
- Any change to shared A4, print, PDF-generation, or export code must preserve the Individual Table Charts page exactly.
- After any authorized change that could affect this feature, run its focused regression suite with `npx.cmd vitest run src/lib/individualTableChartA4.test.tsx` and keep the suite passing.
