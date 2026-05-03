I’ll make a focused desktop-only fix in `src/components/Dashboard/GuestListTable.tsx` to force the Guest List table to behave like a locked spreadsheet grid, without touching mobile/tablet, colors, text, or functionality.

Implementation plan:

1. Force native fixed table layout
- Change the desktop table to use `className="w-full table-fixed border-collapse"`.
- Keep the existing `<colgroup>` as the single source of truth for column widths.
- Remove the inline table-layout workaround once Tailwind `table-fixed` is applied.

2. Standardize header and body cell alignment
- Apply consistent table-cell classes to all desktop headers and data cells:
  - `text-center align-middle px-2 py-2`
- Keep first-column padding compact where needed, but keep it centered and table-cell based.
- Keep loading/empty/group rows valid with `colSpan={15}`.

3. Remove flex layout from table structure
- Remove `flex`, `inline-flex`, `items-*`, and `justify-*` classes from desktop `<TableHead>`, `<TableRow>`, and `<TableCell>` content where they are causing column drift.
- Replace stacked header labels with simple inline/block text that does not create flex layout inside table headers.
- Keep the existing two-line header text visually stacked using non-flex markup.

4. Contain the Send RSVP button inside its assigned column
- Keep the button text as:
  - `Send`
  - `RSVP & Invite`
- Remove `inline-flex`, `flex-col`, `items-center`, and `justify-center` from the button.
- Use table-safe inline/block text and compact padding so it cannot stretch or push the column.

5. Clean up desktop cell contents that currently behave like flex
- RSVP Invite cell: remove the extra flex wrapper and let the badge sit centered by the cell alignment.
- RSVP Status badge: remove nested flex wrappers and width constraints that can fight the column grid.
- Relation OFF pill / Family Group pill / Notes pill / Actions: replace flex-based wrappers with table-safe inline elements or inline grid where needed, keeping the same visible labels, colors, and click actions.
- Keep tooltips, badges, edit/delete buttons, RSVP invite logic, +Guest logic, notes logic, and all existing handlers unchanged.

Expected result:
- Headers sit directly above their corresponding data columns.
- Columns stay vertical and fixed like Excel.
- No header/data drift when resizing desktop viewport.
- The first Send RSVP column stays contained within its colgroup width.
- Mobile/tablet markup remains untouched.