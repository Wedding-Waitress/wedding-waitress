## Running Sheet — Brown Logo Branding Update

Replace the legacy purple Wedding Waitress logo with the brand brown version across all Running Sheet surfaces. No layout, color, or spacing changes.

### 1. Main PDF Export — `src/lib/runningSheetPdfExporter.ts` (locked file, owner-approved branding change)
- Remove the static import of `@/assets/wedding-waitress-new-logo.png`.
- Update `loadLogoAsDataUrl()` to fetch the public asset `/wedding-waitress-logo-brown.png` instead.
- Footer dimensions (`FOOTER_LOGO_WIDTH_MM = 42`, `FOOTER_LOGO_HEIGHT_MM = 12`, centered placement) remain unchanged → identical size, alignment, and spacing on every page.

### 2. Shared Link Public Page — `src/pages/RunningSheetPublicView.tsx`
- Line 512: change `src="/wedding-waitress-share-logo.png"` → `src="/wedding-waitress-logo-brown.png"`.
- Keep all surrounding layout, container, and "Powered by Wedding Waitress" caption intact.

### 3. PDF From Shared Link
- The shared link's "Download PDF" button reuses `exportRunningSheetPDF` from `runningSheetPdfExporter.ts`, so step 1 automatically covers it — no extra edit needed.

### Files to be edited
- `src/lib/runningSheetPdfExporter.ts`
- `src/pages/RunningSheetPublicView.tsx`

### Out of scope (unchanged)
- Layout, table styling, brown header divider, footer text, page numbers, generated timestamp.
- Notes-exclusion-from-PDF rule (preserved).