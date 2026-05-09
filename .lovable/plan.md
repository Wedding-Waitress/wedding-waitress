# Stage 7 Finalization Plan (approved with DOM-preservation guardrail)

## CRITICAL GUARDRAIL (added per user)

> During extraction, preserve all existing DOM hierarchy/order for Invitations wherever possible. Do not refactor merely for code elegance if it risks changing rendering, spacing, hydration, responsiveness, or export output.

Concretely this means:
- Same parent → child node order in the rendered tree.
- Same wrapper `<div>`s, same `className` strings, same inline styles, same data-attributes.
- Same conditional render order (e.g., tabs render in the same sequence).
- Same React key strategy on lists (no key changes that would force remounts).
- Same hook call order in `InvitationCardCustomizer` / `InvitationCardPreview` (no reordering of `useState`/`useEffect`).
- No `<Fragment>` collapsing or wrapper-div removal "for cleanliness".
- If extracting a block would require any structural change, leave the block inline in Invitations and only have Signage consume the new primitive.

## 1. PinchZoom Preview Wrapper (Signage only)

`src/components/Dashboard/Signage/SignagePage.tsx`:
- Wrap ONLY the preview area in `<PinchZoomContainer naturalWidth={...}>`.
- `naturalWidth = 794` (portrait) / `1123` (landscape), switched on `signageSettings.orientation`.
- Do NOT wrap header, event selector, tab strip, editor controls, or export buttons.
- Touch detection stays internal to the container (`navigator.maxTouchPoints > 0`).
- Invitations preview is NOT wrapped (locked behavior preserved).

## 2. Stationery/core Shared Primitive Extraction (DOM-preserving)

**New folder:** `src/components/Stationery/core/`

**Extraction rule:** each primitive is a 1:1 lift of an existing JSX block from `InvitationCardCustomizer.tsx` / `InvitationCardPreview.tsx`. Internal markup is copied verbatim. Props expose only the values that already vary (titles, labels, callbacks, data) — not structure.

Primitives:
- `StationeryEditorShell.tsx` — header card + event selector + export slot wrapper.
- `StationeryPreviewShell.tsx` — cream container + A4 stage + scaling logic.
- `StationeryTabs.tsx` — Background / Text Zones / QR Code / Messages tab strip.
- `StationeryStripSelector.tsx` — brown-pill selector (Save the Date / Thank You for Invitations; Portrait / Landscape for Signage). Identical DOM, identical classes.
- `StationeryZoomControls.tsx` — zoom +/− control, lifted as-is.
- `StationeryExportPanel.tsx` — export button group.
- `BackgroundTab.tsx`, `TextZonesTab.tsx`, `QRCodeTab.tsx`, `MessagesTab.tsx` — tab body components, markup unchanged.
- `ColorSwatchPopover.tsx` — color picker popover, lifted as-is.

Hooks:
- `useStationeryAutosave.ts` — generic wrapper around the existing Invitations autosave pattern (table name + payload shape parameterized). Same debounce, same toast, same write semantics.
- `useImageUpload.ts` — shared background/image upload pipeline (Canva + standard), parameterized by storage folder. Same compression and preview behavior.
- `useStationeryExport.ts` — thin wrapper over existing `invitationExporter.ts` (filename + orientation params). Underlying export engine unchanged.

**Invitations refactor flow:**
1. For each primitive, lift JSX from Invitations into `core/` byte-equivalently.
2. Replace the inline block in `InvitationCardCustomizer.tsx` / `InvitationCardPreview.tsx` with `<CorePrimitive ...sameProps />`.
3. If a lift would change DOM order, classes, hook order, or hydration shape — STOP and leave it inline; Signage will use the core version, Invitations keeps the inline version.
4. No prop renames on Invitations public APIs.
5. No CSS token, className, or design-token edits.

**Signage refactor flow:**
1. `SignagePage.tsx` rebuilt as a slim composition of core primitives + the Portrait/Landscape variant of `StationeryStripSelector`.
2. Drops the current direct-import-with-overrides path on `InvitationCardCustomizer`.
3. `useSignageSettings.ts` keeps its public shape; uses `useStationeryAutosave` internally.

## 3. Invitations Regression Verification Pass

**Static checks:**
- TypeScript build clean.
- Diff `InvitationCardCustomizer.tsx` and `InvitationCardPreview.tsx`: confirm same rendered DOM order, same classNames, same hook order.
- No changes to `invitationExporter.ts` behavior.
- No changes to locked design tokens.

**Functional checklist (Invitations route only):**
- Save the Date / Thank You strip selector: same brown active pill, hover, height, radius, responsive stacking.
- Background tab: color picker popover, image upload (standard + Canva), remove-image — all identical.
- Text Zones tab: add/edit/delete, font picker, color, alignment — identical.
- QR Code tab: same rendering, position, size, contrast.
- Messages tab: identical.
- Zoom controls: +/− and reset identical.
- Export: same PDF/PNG output, same 300 DPI quality, same filename.
- Autosave: same debounce, same toast, same DB write.
- Mobile responsiveness: identical breakpoints/stacking.

**Signage smoke (no full QA yet):**
- Portrait ↔ Landscape flip.
- QR clamp ≥ 17% portrait / ≥ 12% landscape; default bottom-center / bottom-right.
- Export filename `WW-Sign-{EventName}-{Orientation}.pdf` / `.png`.
- PinchZoom active on touch devices only; not wrapping header/selector/exports.

**Output:** short pass/fail checklist with any deltas found and fixed.

## Order of operations

1. Extract core primitives + hooks (DOM-preserving lifts only).
2. Refactor Invitations to consume core where safe; leave inline where not.
3. Refactor Signage to consume core directly (drop prop-override piggyback).
4. Add PinchZoom wrapper around Signage preview only.
5. Run regression checklist; report results. No user-facing testing requested yet.

## Out of scope

Drag-and-drop beyond Invitations parity, printing, checkout, credits, marketplace, additional themes, sponsor branding UI, retroactive PinchZoom on existing pages.
