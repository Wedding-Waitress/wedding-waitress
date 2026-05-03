Desktop-only fix in `src/components/Dashboard/GuestListTable.tsx` for the Guest List table (`lg:` and up). Mobile/tablet, colors, labels, and functionality stay untouched.

## Root cause of the visible "zigzag"

The desktop table is already a true `<table className="table-fixed border-collapse">` with a `<colgroup>` totaling 100%, so columns are structurally locked. The remaining visual misalignment comes from row-level inline content shifting horizontally inside otherwise-fixed cells:

1. First Name cell (line ~2328): a conditional inline bullet `<span class="inline-block w-2 h-2 ... mr-2"/>` is rendered ONLY for couple/family members. Because the cell is `text-center`, that bullet pushes the name horizontally on grouped rows but not on individual rows — producing the zigzag the user sees on First Name (and a perceived knock-on shift on Last Name).
2. Actions cell (line ~2503): wrapped in `inline-flex ... whitespace-nowrap` containing two ghost `<Button>`s with default padding; this can spill beyond the 6% column on some viewports and visually "lean" the column.
3. RSVP Status badge (line ~2395): uses `min-w-[68px]` which can exceed the 7% column on narrower desktops and force the cell to widen.
4. RSVP Invite badge (line ~2382): uses `whitespace-nowrap`; long labels like "Both Sent" can also push the 6% column.

Everything else (`<TableHead>` / `<TableCell>` paddings, `text-center align-middle`, no flex on rows) is already correct.

## Changes

### 1. First Name cell — remove the row-shifting bullet

Replace the conditional `mr-2` bullet inside the First Name `<TableCell>` so the name renders identically on every row.

- Remove the `<span class="inline-block w-2 h-2 rounded-full bg-[#967A59] mr-2 align-middle" />` from the desktop First Name cell.
- Keep grouped-row identification via the existing `border-l-4 border-l-[#EDE5DB]` already on the `<TableRow>` — the bullet is redundant with that and with the orange/blue group header row above.
- Result: First Name column is perfectly vertical for every row, individual or grouped.

### 2. Actions cell — drop the inline-flex wrapper

Replace the `<span class="inline-flex items-center justify-center gap-1 whitespace-nowrap">` wrapper around the two action buttons with a plain inline container that respects the 6% column:

- Use a non-flex wrapper (e.g. plain `<span class="whitespace-nowrap">`) and rely on the cell's `text-center align-middle` for centering.
- Tighten button padding so two icons fit within 6% (use `size="icon"`-style compact classes such as `h-8 w-8 p-0` on each `<Button>`), keeping the existing `Edit` (green) and `Trash2` (red) icons and click handlers unchanged.

### 3. RSVP Status badge — remove width override

In the RSVP Status `<TableCell>` badge:

- Remove `min-w-[68px]` and the inner `flex flex-col` "Not / Attending" stack.
- Render the label as a single line (or use a `<br />` for the "Not Attending" two-liner) so the badge cannot exceed its 7% column.
- Keep colors (`getRsvpBadgeVariant`) and the existing label text untouched.

### 4. RSVP Invite badge — allow safe wrap

On the RSVP Invite `<Badge>`:

- Remove `whitespace-nowrap` so long labels wrap inside the 6% column instead of forcing the cell wider.
- Keep all status colors and labels exactly as today.

### 5. + Guest header tooltip — non-flex trigger

The `<TooltipTrigger asChild>` already wraps a `<span class="block leading-tight">`, which is fine. No change required — listed here only to confirm it stays as-is.

### 6. Confirm structural invariants (no code change, just verify after edits)

- `<Table className="w-full table-fixed border-collapse">` stays.
- `<colgroup>` 15 cols totaling 100% stays as the single source of column widths.
- All `<TableHead>` and `<TableCell>` keep `text-center align-middle px-2 py-2` (first column keeps `px-1`).
- No `flex`, `inline-flex`, `min-w-*`, `w-auto`, or `justify-*` remain on any desktop `<TableHead>`, `<TableRow>`, or `<TableCell>` structural element.
- Horizontal row separators (existing `border-card-border` on `<TableRow>`) are preserved. No vertical borders are added.

## Out of scope (untouched)

- Mobile card view (`lg:hidden` block).
- Stats bar, filter chips, modals, pagination.
- Group header row (orange/blue) — keeps `colSpan={15}` and inner flex (it spans the whole row, so it can't break columns).
- Colors, labels, RSVP/invite logic, +Guest toggle logic, edit/delete handlers, realtime, tooltips.

## Expected result

- First Name and Last Name columns render perfectly vertical on every row (no bullet-induced zigzag).
- RSVP Status / RSVP Invite / Actions cells stay strictly inside their `<colgroup>` widths.
- Headers sit exactly above their data, Excel-style, with no visible vertical lines and existing horizontal row separators preserved.
