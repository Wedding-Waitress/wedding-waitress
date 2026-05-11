## Wire selected print size into PDF export

Scope: `src/components/Dashboard/Signage/SignagePage.tsx` only. The export engine `src/lib/invitationExporter.ts` already accepts `widthMm`/`heightMm` and uses 300 DPI rendering — no engine changes needed.

### 1. Add `PRINT_DIMENSIONS` constant

Right under `PRINT_SIZES` (around line 67):

```ts
const PRINT_DIMENSIONS = {
  a0: { widthMm: 841, heightMm: 1189 },
  a1: { widthMm: 594, heightMm: 841 },
  a2: { widthMm: 420, heightMm: 594 },
  a3: { widthMm: 297, heightMm: 420 },
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
  dl: { widthMm: 99, heightMm: 210 },
  postcard: { widthMm: 105, heightMm: 148 },
  business: { widthMm: 90, heightMm: 55 },
} as const;
```

### 2. Update `handleDownloadPDF` (lines 166-204)

- Guard early: `if (!printSize) return;` (button is already gated, defence-in-depth).
- Resolve dims from `PRINT_DIMENSIONS[printSize]`. Force portrait (always pass dims as-is — even the Business Card 90×55 entry is intentionally portrait per spec).
- Replace hard-coded A4 width/height with the resolved values.
- Pass `orientation: 'portrait'` to `exportInvitationPDF` so jsPDF uses portrait.
- Update filename to include the size label, e.g. `WW-Sign-{eventName}-{A1|A4|DL Card|...}-Portrait.pdf` (uses `PRINT_SIZES.find(p => p.id === printSize)?.label`).
- `handleDownloadPNG` is left untouched (PNG is out of scope and not exposed in UI).
- `useCallback` dependency array gets `printSize` added.

### 3. UI additions inside Print & Export Studio panel

**a. Selected-card footer** (inside the size button, only when `active`):
```tsx
{active && (
  <span className="text-[10px] font-medium text-primary mt-2">✓ Selected for export</span>
)}
```

**b. Professional print note** below the existing italic "Select a print size to enable download." hint (always visible):
```tsx
<p className="text-[11px] text-muted-foreground leading-relaxed">
  All exports are generated as high-resolution print-ready PDFs for professional printing.
</p>
```

### Out of scope (untouched)
- `invitationExporter.ts` and `pdfExportUtils.ts` engine
- Preview canvas / designer / orientation / PNG / bleed / crop marks
- Database, state management beyond the existing `printSize` state
- `handleDownloadPNG`