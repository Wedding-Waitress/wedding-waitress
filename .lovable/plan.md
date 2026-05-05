## Root cause

Investigation of `src/components/Dashboard/GuestListTable.tsx` and `src/pages/Dashboard.tsx`:

- The desktop guest table (`hidden lg:block` block, line 2286) was wrapped in `<PinchZoomContainer naturalWidth={1400}>` at line 2287, closed at line 2648, with the import added at line 114.
- `PinchZoomContainer` renders its inner wrapper with `width: 'max-content'` and a CSS `transform: scale(...)` that fits naturalWidth (1400) into the actual container width. Inside that `max-content` wrapper sits a `<Table className="w-full table-fixed border-collapse">` whose `colgroup` uses percentage widths.
- With `table-fixed` + percentage colgroup widths inside a `max-content` parent, the table collapses to ~0 intrinsic width, so normal `<tr>` cells render with no visible content. Group header rows use `colSpan` with explicit coloured backgrounds, so only those bars remain visible — exactly the symptom in the screenshot.
- This wrap also violates the locked rule for the desktop block (mem://standards/guest-list-desktop-table-locked, dated 2026-05-03), which freezes `colgroup`/widths and `table-fixed` behaviour.
- No `React.memo` was added to guest row components, and `useGuests` / `useRealtimeGuests` still fetch eagerly on mount — those two suspected causes are not the issue.

## Fix (single file: `src/components/Dashboard/GuestListTable.tsx`)

1. Remove the import at line 114:
   `import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';`
2. Remove the opening `<PinchZoomContainer naturalWidth={1400}>` at line 2287.
3. Remove the matching closing `</PinchZoomContainer>` at line 2648.

The surrounding `<div className="hidden lg:block overflow-hidden border-t-2 border-primary">` wrapper, the `<Table>`, `colgroup`, header row, group header rows, body rows, the `h-12 bg-primary` footer strip, and the `</Card>` close all remain exactly as they were before the PinchZoom wrap.

No changes to:
- Mobile (`max-lg:`) block in the same file.
- `useGuests`, `useRealtimeGuests`, or any data-fetching hook.
- `Dashboard.tsx` (the StatsBar PinchZoom wrap on `table-list`/`guest-list` is separate and not the cause — it stays).
- Any other page that uses `PinchZoomContainer`.

## Verification

After the edit, the desktop Guest List should render:
- Full rows with First Name, Last Name, Send RSVP & Invite, RSVP, Table, Seat, Dietary, Mobile, Relation, and action columns.
- Orange couple and blue family group header bars unchanged, with `pl-[7%]` indent.
- Pixel-identical to the locked 2026-05-03 desktop layout.
- Pagination, search, sort, import/export, and Add Guest controls unchanged.
