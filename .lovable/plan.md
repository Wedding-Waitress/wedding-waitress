## DJ & MC Questionnaire — Brand Consistency Pass

Confirmed brown logo standard used by sibling PDFs (Floor Plan / Seating / Dietary): `/wedding-waitress-logo-brown.png` from the public folder.

Brown brand colors:
- Primary brown (headings, dividers): `#967A59` → RGB `(150, 122, 89)`
- Soft brown (subtle dividers): primary at 30% opacity → approx `(217, 207, 195)`

### 1. Rename "DJ-MC Questionnaire" → "DJ & MC Questionnaire" (UI text only)

UI text changes (no route, key, type, or DB changes):
- `src/components/Dashboard/AppSidebar.tsx` line 69 — sidebar label
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`:
  - Line 140 — page heading
  - Line 98 — toast "Your DJ-MC Questionnaire has been downloaded." → "Your DJ & MC Questionnaire has been downloaded."
  - Line 171 — helper text "share it with your DJ-MC or any of your vendors" → "share it with your DJ & MC or any of your vendors"
- `src/pages/DJMCPublicView.tsx` line 524 — "DJ-MC questionnaire of" → "DJ & MC questionnaire of"

Routes (`/dj-mc/...`), tab id (`dj-mc-questionnaire`), DB tables (`dj_mc_*`), and RPC names stay unchanged.

### 2. PDF Export — `src/lib/djMCQuestionnairePdfExporter.ts`

Replace the purple branding with the brown brand color across the PDF:

- Line 30–31: change the `PURPLE` constant (which is currently `#6D28D9`, mislabeled `#967A59`) to actual brown `(150, 122, 89)`. Rename to `BROWN` (or keep variable name to minimize diff — I'll rename for clarity).
- Line 270 — section title color: use brown (already via constant).
- Line 329 — music link color: switch from hard-coded `(109, 40, 217)` purple to brown `(150, 122, 89)`.
- Line 364 — header event name color: brown (via constant).
- Line 396 — header divider color: brown (via constant).
- Add a soft brown row separator update if needed (currently `(230,230,230)` neutral grey — keep, no purple).
- Line 372 — subtitle text "DJ-MC Questionnaire" → "DJ & MC Questionnaire".

Footer logo (line 15):
- Replace `import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';` with a fetch of `/wedding-waitress-logo-brown.png` to match the pattern used by Full Seating Chart, Dietary Chart, and Ceremony Floor Plan PDFs. Update `loadLogoAsDataUrl` to fetch the public URL instead of importing the asset.

This export function is shared by:
- "Download entire questionnaire PDF" button (dashboard)
- "Download PDF" button on the public shared link page (top-right) — automatic parity ✅
- Per-section PDF downloads — automatic parity ✅

### 3. Public Shared Page Footer — `src/pages/DJMCPublicView.tsx`

Line 640 — replace footer logo `src="/wedding-waitress-share-logo.png"` (purple) with `src="/wedding-waitress-logo-brown.png"`. Keep layout, sizing (`h-10`), and link wrapper unchanged.

### Files to be edited
1. `src/components/Dashboard/AppSidebar.tsx`
2. `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`
3. `src/pages/DJMCPublicView.tsx`
4. `src/lib/djMCQuestionnairePdfExporter.ts`

### Out of scope
- No changes to layout, spacing, table column structure, fonts, or content
- No DB / route / RPC / type changes
- No changes to the locked file header comments (file remains production-marked; this is an explicitly approved branding pass)
