# PDF dependency security compatibility check — 27 October 2026

Prepared on a separate branch based on release commit bc61fc6976d992d1f2397977d7368b55f8abd603. Do not merge into the release candidate until protected printable-output verification is complete. No production deployment or live data changes.

## Change
Pin pdfjs-dist from the existing 5.7.284 installation to 6.4.299; preserve the lockfile. No application renderer, pricing, schema, layout or protected print template was changed.

Vendor advisory: [Mozilla PDF.js GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j). It identifies enabled PDF scripting without a restrictive CSP as the triggering configuration and lists 6.2.108 as patched. The chosen version is newer; current app use is the getDocument/getPage/canvas rasterization helper, without a viewer/ScriptingManager or AnnotationLayer in application source. No exploitability all-clear is inferred solely from that source review.

## Verified
- Installed and locked version 6.4.299. Node runtime satisfies the package engine requirement.
- Three deterministic synthetic calibration PDF pages were rasterized with versions 5.7.284 and 6.4.299. Extracted text and page sizes matched; every RGBA channel matched exactly (maximum difference 0, pixels differing beyond threshold 0% on each page). Portrait and landscape sizes were covered. One rendered output was visually inspected.
- The compatibility harness was adjusted to destroy the loading task, because PDFDocumentProxy.destroy is absent in the tested newer API. The application does not use that removed method; no app helper change was needed.
- Existing Individual Table Chart A4, print mirror contract and print pixel comparator suites: 3 files / 44 tests passed with the installed upgrade.
- TypeScript noEmit check passed.
- QA-configured production build passed, 23.35 seconds; emitted API and worker bundles contain version 6.4.299.
- Fresh npm audit --omit=dev no longer reports pdfjs-dist. Remaining metadata counts: zero critical, one high and two moderate. Remaining packages: zod, react-router and react-router-dom. This is not a clean security audit.

## Remaining release gate
The calibration fixture is deliberately synthetic and is NOT a rendered baseline of the approved Wedding Waitress features. The repository's docs/PRINT_PDF_MIRROR_CONTRACT.md requires actual authoritative preview-to-PDF comparisons, including the protected Individual Table Charts and maximum Ceremony fixture on desktop/tablet/mobile wrappers. Those have not been completed with this upgrade. Authenticated application access and a controlled renderer fixture are still needed. Keep this dependency change separate from the verified release candidate until that requirement is satisfied.

## Other dependency review
Application Zod imports are scalar/object schemas in guest/profile validation, contact/help/account forms and reset-password validation; no z.array, z.map, z.set or chained array schema was found in application/Edge source. The installed package is still flagged; this source observation narrows the reported collection-exhaustion path and does not clear the advisory or validate a major-version migration.
React Router is used via client-side BrowserRouter; no server hydration entry point was found in main/App. Authentication return paths are restricted by getSafeAuthenticatedReturnTo. Full advisory-specific review is unfinished.
