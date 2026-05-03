## Goal
Replace the bare bulk-select checkbox in the Guest List **PC/desktop table header** with a small labeled control reading **"Send RSVP & Invite"** stacked above (or beside) the checkbox, styled to sit cleanly on the brown header background.

Mobile card view stays exactly as it is today ("Send RSVP's & Invitation" pill) — no changes there.

## Scope (single file)
- `src/components/Dashboard/GuestListTable.tsx` — desktop `<TableHeader>` only.

No other files, no other pages, no other behaviour.

## Visual spec (PC header cell, leftmost column)

```text
+----------------------------------+
|  Send RSVP & Invite              |
|  [ ✓ ]                           |
+----------------------------------+
```

- Label: `Send RSVP & Invite`
  - Single line, `text-[11px]` / `text-xs`, `font-medium`, `text-white`, `whitespace-nowrap`, `leading-tight`.
- Checkbox: existing bulk-select checkbox, unchanged behaviour, centered horizontally under the label.
- Vertical stack: `flex flex-col items-center justify-center gap-1`.
- Header cell padding: keep existing `px-2`/`py-2`; bump min-width slightly (e.g. `min-w-[120px]`) so the label never wraps.
- No border, no background pill — the label sits directly on the brown header (matches the other column titles like "First Name", "Mobile", "Email").

## Behaviour (unchanged)
- Checkbox still toggles select-all-on-page.
- Indeterminate / checked states preserved.
- Clicking the **label** does nothing (label is presentational only) — only the checkbox toggles selection. This avoids accidental select-all when users tap near the text.

## Column-width rebalancing
The new header cell needs ~120px instead of the current ~40px. To absorb the extra ~80px without squeezing First/Last Name, trim from the two widest flexible columns:
- `Email` column: reduce by ~50px (it currently has the most slack).
- `Dietary` column: reduce by ~30px.

First Name, Last Name, Mobile, Relation, Table, Actions — untouched.

## What is NOT changing
- Mobile guest card "Send RSVP's & Invitation" pill — untouched.
- Row-level checkboxes in each guest row — untouched.
- Any other header label, column, sort behaviour, or styling.
- The Relation column "OFF" pill logic from the previous task — untouched.
- No translation keys added (label is English-only, matching the surrounding column titles which are also untranslated in this table).

## Acceptance check
1. PC view (≥1024px): leftmost header cell shows "Send RSVP & Invite" on one line above the bulk-select checkbox, both centered, white text on brown.
2. Label never wraps at viewports down to the table's normal min-width.
3. Bulk-select checkbox still works exactly as before.
4. Tablet + mobile views are visually identical to current behaviour.
5. No other column shifts noticeably except Email/Dietary getting slightly narrower.

Once you approve, I'll switch to default mode and make the edit to `GuestListTable.tsx` only.