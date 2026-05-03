## Goal
Fix Guest List desktop header so headers sit perfectly above their data columns, with three headers stacked on two lines for compactness. Desktop only (`hidden lg:block` branch in `src/components/Dashboard/GuestListTable.tsx`). No mobile/tablet, color, or functional changes.

## Why the current header looks misaligned
The table already uses `tableLayout: fixed` with a `<colgroup>` — that's the correct locked-grid setup, and column widths are already enforced. The visual drift in the screenshot is caused by **header text alignment**: most `<TableHead>`s are left-aligned (default), while a few are `text-center`, and the body cells underneath use mixed alignments (centered pills, centered numbers). Centering all headers makes them visually sit above their centered data, which is the user's "locked spreadsheet" expectation.

## Changes (single file: `src/components/Dashboard/GuestListTable.tsx`, lines 2200–2261)

### A. Stack three headers on two lines

- **Table No** → `Table` / `No`
- **Seat No.** → `Seat` / `No`
- **Family/Group** → `Family` / `Group`

Also stack **Dietary Requirements** → `Dietary` / `Requirements` (already two words taking too much horizontal room — same compact pattern).

Each uses:
```tsx
<span className="flex flex-col items-center leading-tight">
  <span>Table</span>
  <span>No</span>
</span>
```

### B. Apply consistent header alignment + padding

Every `<TableHead>` in the desktop header row gets:
```
px-2 py-2 text-xs text-center align-middle
```

The first cell (Send pill) keeps `bg-primary text-primary-foreground px-1 py-2 text-center align-middle` so the pill stays centered without stretching.

The `+ Guest` cell preserves its existing click handler, tooltip, and `cursor-pointer hover:bg-primary/80 transition-colors select-none` — only the alignment classes are normalized.

### C. What I am NOT touching
- `<colgroup>` widths — already correct, columns are locked.
- `tableLayout: 'fixed'` — already set on the `<Table>`.
- `<TableBody>` / row cells — untouched (they already inherit width from colgroup; changing them is out of scope per "do not change anything else").
- Mobile/tablet card view, colors, the brown header background, the white-bordered Send pill, +Guest toggle behaviour, Relation OFF pill, sort logic, bulk modal trigger.

## Acceptance check
1. Headers `Table No`, `Seat No.`, `Family/Group`, `Dietary Requirements` show on two lines, centered.
2. All header labels are centered above their column.
3. No column drifts — headers stay vertically aligned with the data rows.
4. Send pill remains a single white-bordered tablet button with "Send" / "RSVP & Invite" stacked.
5. Mobile + tablet visually unchanged.
6. No color, sort, or click behaviour change.

Approve and I'll apply the edit immediately in default mode.
