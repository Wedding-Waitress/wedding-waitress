## Phase 3 — Address Status Column in Guest List Table

Single file: `src/components/Dashboard/GuestListTable.tsx`. No DB, no other files, no other features touched.

### 1. Desktop table (lg block, ~line 2522)

Gated by `collectGuestAddresses === true` (state already exists, line 189/765).

**colgroup (line 2525-2541):** when toggle ON, insert a new narrow `<col style={{ width: '5%' }} />` after the Email col (line 2533). Trim 1pt each from a few wider cols (Relation 8→7, Dietary 8→7, Family 7→6, First/Last 7%→7%) to absorb the 5% — keep total = 100. Render the extra `<col>` conditionally so the layout is byte-identical when OFF.

**Header row (line 2542-2617):** conditionally render a new `<TableHead>` "Address" between Email (2559) and the + Guest header (2560). Same classes as Email/Mobile head cells. No new styling primitives.

**Body cell:** in every guest body row that mirrors the headers, conditionally render a centered cell containing a status pill:
- `address_received === true` → green pill "YES" (reuse existing success pill classes already used in the table for YES — same component as Mobile/Email YES/NO pills shown in the screenshot).
- otherwise → red pill "NO" (same red pill).
- Wrap the YES pill in the existing `Tooltip` (already imported, used at line 2583) showing non-empty lines:
  - line 1: `mailing_address`
  - line 2: `mailing_suburb`
  - line 3: `mailing_state` + " " + `mailing_postcode` (joined, trimmed)
  Skip empty lines. NO pill gets no tooltip.

Group header rows (orange/blue) get the same conditional empty `<TableCell />` inserted in the same position so colspan/alignment stays correct (or bump their existing colSpan by 1 when toggle ON).

### 2. Mobile card view (max-lg, ~line 2418 grid)

When `collectGuestAddresses === true`, add one more cell to the `grid-cols-2` info grid after Email:

```
Address
[YES] / [NO]   (same pill component, no tooltip)
```

Label uses the same `text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]` style as Mobile/Email labels. No full address text on mobile.

### 3. Hidden when toggle OFF

Every addition above is wrapped in `collectGuestAddresses && (...)`:
- extra `<col>` not rendered → colgroup totals back to current widths
- header cell not rendered
- body cells not rendered
- mobile grid cell not rendered
- group-header colSpan unchanged

Result: when `collect_guest_addresses` is false the table is byte-identical to today.

### Out of scope (explicit)

GuestLookup, EnhancedGuestCard, AddGuestModal, Live View, RSVP/seating/QR, invites, SMS/email, imports/exports, Google Places, validation, family/couple sharing, DB schema. No new dependency. No new shared helper unless a 3-line `formatMailingLines(guest)` inline helper is added at top of the file.

### Verification

- Toggle OFF → desktop table + mobile cards visually unchanged (no extra column, no spacing, no header).
- Toggle ON → Address column appears between Email and + Guest; YES = green, NO = red; hover YES on desktop → tooltip with up to 3 non-empty lines; mobile cards show Address: YES/NO pill, no full address.
- No table overflow at 1280/1366/1440/1920; group header rows still align.
- Existing locked behaviors (group headers, First Name alignment, Send RSVP & Invite column, table-fixed) preserved when toggle OFF; minimally adjusted only when ON.