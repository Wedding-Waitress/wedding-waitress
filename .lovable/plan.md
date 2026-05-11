## Scope
`src/components/Dashboard/Signage/SignagePage.tsx` — only the "Print & Export Studio" panel. UI-only.

## Add: print size constant (top of file)

```ts
const PRINT_SIZES = [
  { id: 'a0', label: 'A0', dims: '841 × 1189 mm', best: 'Best for large venue entrance signs' },
  { id: 'a1', label: 'A1', dims: '594 × 841 mm', best: 'Best for foyer seating charts & easels', recommended: true },
  { id: 'a2', label: 'A2', dims: '420 × 594 mm', best: 'Best for entry-table signs' },
  { id: 'a3', label: 'A3', dims: '297 × 420 mm', best: 'Best for welcome signs' },
  { id: 'a4', label: 'A4', dims: '210 × 297 mm', best: 'Best for table signage' },
  { id: 'a5', label: 'A5', dims: '148 × 210 mm', best: 'Best for small table cards' },
  { id: 'dl',  label: 'DL Card', dims: '99 × 210 mm', best: 'Best for upload QR cards' },
  { id: 'postcard', label: 'Postcard', dims: '105 × 148 mm', best: 'Best for keepsake QR cards' },
  { id: 'business', label: 'Business Card', dims: '90 × 55 mm', best: 'Best for guest QR handouts' },
] as const;
```

## State
Add `const [printSize, setPrintSize] = useState<string | null>(null);` next to existing `exporting` state.

## UI inside the studio panel
Between the heading block and the existing button row, insert a new "Choose Print Size" section:

- Section label: `Choose Print Size` (sm, semibold, brown).
- Responsive grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3` (keeps panel compact even on lg).
- Each card = `<button>` with:
  - Min-height `~92px`, `rounded-xl`, `border`, `p-3`, left-aligned text, `lv-premium-shade`.
  - Inactive: `border-border bg-background hover:border-primary/60 hover:bg-[hsl(var(--primary)/0.04)] transition-all`.
  - Active (`printSize === id`): `border-primary bg-[hsl(var(--primary)/0.08)] ring-2 ring-primary/30 shadow-soft`.
  - Title row: bold label + dims (muted, smaller). Recommended item shows a small ⭐ badge `Recommended` in brown.
  - Helper line: `text-[11px] text-muted-foreground` with the "Best for…" text.
- All buttons type=`button` to avoid form submission.

## Download gating
- The existing PDF button gets `disabled={!settings || exporting !== null || !printSize}`.
- When `!printSize`, show a tiny muted hint right under the buttons: `Select a print size to enable download.`
- No change to `handleDownloadPDF` logic itself — it just won't be reachable until a size is chosen (button disabled).

## Out of scope
- Landscape toggle.
- Resizing preview canvas.
- Plumbing `printSize` into the PDF exporter.
- Any other section, page, or styling.
