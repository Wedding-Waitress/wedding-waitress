## Phase 4 — Live View Mailing Address Integration

Additive only. Existing RSVP cutoff (`isEditable`), event-day search rules, QR seating, lock window, plus-one logic, welcome media — all untouched.

### 1. Backend RPCs (required — public flow uses SECURITY DEFINER only)

Two RPC updates (no table schema changes, no RLS changes):

**a. `update_guest_rsvp_public`** — add 4 optional params and write address fields:
- `_mailing_address text DEFAULT NULL`
- `_mailing_suburb text DEFAULT NULL`
- `_mailing_state text DEFAULT NULL`
- `_mailing_postcode text DEFAULT NULL`

In the UPDATE, set each field via `COALESCE(_x, mailing_x)` (existing pattern for mobile/email/notes). Compute `address_received` after update inside the same statement: `address_received = (COALESCE(NULLIF(trim(COALESCE(_mailing_address, mailing_address)), ''), NULLIF(trim(COALESCE(_mailing_suburb, mailing_suburb)), ''), NULLIF(trim(COALESCE(_mailing_state, mailing_state)), ''), NULLIF(trim(COALESCE(_mailing_postcode, mailing_postcode)), '')) IS NOT NULL)`. Add the 4 fields to the `guest_update_logs` payload jsonb. Function signature change → `DROP FUNCTION` then `CREATE OR REPLACE`.

**b. `get_public_event_with_data_secure`** — extend the returned row set:
- event-level: `event_collect_guest_addresses boolean`
- guest-level: `guest_mailing_address text`, `guest_mailing_suburb text`, `guest_mailing_state text`, `guest_mailing_postcode text`, `guest_address_received boolean`

Existing privacy toggles (`show_venue`, `show_partner_names`, `show_event_date`) are unaffected. No new RLS, no new table.

### 2. `src/pages/GuestLookup.tsx`

- Extend `eventData` (line ~266) with `collect_guest_addresses: !!firstRow.event_collect_guest_addresses`.
- Extend the transformed `guests` map (line ~286) with the 4 mailing fields + `address_received` (default null/false).
- No changes to search logic, lock-window logic, RSVP flow, +1 flow, welcome/menu/floor plan.

### 3. `src/components/GuestLookup/GuestUpdateModal.tsx`

- Extend `Guest` and `Event` interfaces with `mailing_address?`, `mailing_suburb?`, `mailing_state?`, `mailing_postcode?` and `collect_guest_addresses?: boolean`.
- Add 4 fields to `formData` defaults + both `useEffect` resets (initial + fresh fetch). Extend the fresh-fetch `select` to include the 4 mailing columns.
- In `handleSave`, pass the 4 fields (trimmed → null) into the RPC call. Address_received is computed server-side, no client logic needed.
- **Render** a new section ONLY when `event?.collect_guest_addresses === true && isEditable === true`, placed **after Mobile Number, before Dietary Requirements** (closest match to "after Email/Mobile, before notes/preferences"):
  - Reuses existing `<Label>` + `<Input className="border-primary w-full">` styles, `space-y-2` per field, parent `space-y-4` spacing.
  - Order: Mailing Address (full width), Suburb (full width), State + Postcode in `grid grid-cols-2 gap-4`. Mobile-first stacking already inherited.
  - Inputs use `maxLength` 200 / 100 / 100 / 20 to mirror Phase 2 schema.
- When `isEditable === false` (24hr lock window) the existing early-return block already hides everything → address fields automatically disappear. No extra logic.
- When `event?.collect_guest_addresses !== true` → section never renders, no spacing reserved.

### 4. `src/components/GuestLookup/EnhancedGuestCard.tsx`

No changes. Mailing addresses must NOT appear on the guest summary/seating card per spec.

### Files NOT touched

GuestListTable.tsx, AddGuestModal.tsx, seating charts, invitations, SMS/email, imports/exports, kiosk, stationery. No DB table/column/RLS changes (Phase 2 already added columns).

### Verification

- Toggle OFF → no address fields anywhere in Live View; existing flow byte-identical.
- Toggle ON + before lock window → 4 fields appear in Update modal between Mobile and Dietary; preload from DB; save persists; `address_received` auto-flips correctly server-side.
- Toggle ON + inside 24hr lock → entire editable form hidden by existing `!isEditable` branch; address fields hidden too.
- Search rules (full-name pre-event vs partial event-day), RSVP, +1, QR seating, welcome media, floor plans — all unchanged.
- Mobile: reused existing input/spacing primitives, no overflow.