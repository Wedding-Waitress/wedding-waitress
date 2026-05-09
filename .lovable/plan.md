# Phase 2 — Guest Mailing Address: DB + Add/Edit Drawer

Add per-guest mailing address fields to `public.guests` and surface them inside the existing Add/Edit Guest drawer (`AddGuestModal.tsx`), gated by the Phase 1 `events.collect_guest_addresses` toggle. No Live View, no table column, no other surfaces.

## 1. Database migration (`public.guests`)

```sql
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS mailing_address text,
  ADD COLUMN IF NOT EXISTS mailing_suburb  text,
  ADD COLUMN IF NOT EXISTS mailing_state   text,
  ADD COLUMN IF NOT EXISTS mailing_postcode text,
  ADD COLUMN IF NOT EXISTS address_received boolean NOT NULL DEFAULT false;
```

No RLS or other schema changes. Supabase types regenerate automatically.

## 2. Validation schema (`src/lib/security/validation.ts`)

Extend `secureGuestSchema` with four optional, sanitized text fields. Keeps existing parsing safe and avoids breaking current callers (all optional, default empty):

```ts
mailing_address: z.string().max(200).transform(sanitizeString).optional().or(z.literal('')),
mailing_suburb:  z.string().max(100).transform(sanitizeString).optional().or(z.literal('')),
mailing_state:   z.string().max(100).transform(sanitizeString).optional().or(z.literal('')),
mailing_postcode: z.string().max(20).transform(sanitizeString).optional().or(z.literal('')),
```

## 3. `src/components/Dashboard/AddGuestModal.tsx`

Single file, used for both Add and Edit modes.

### 3a. Form defaults + edit reset (lines ~169–251)

Add the four fields to:
- `form` `defaultValues` → all `""`.
- The `isEdit && editGuest` reset branch → `editGuest.mailing_address || ""`, etc. (cast `as any` for fields not yet in generated types if needed).
- The non-edit reset branch → all `""`.

Also extend the inline `editGuest` typing block (line ~80) with the four new optional string fields and `address_received?: boolean` so the cast-free reads compile.

### 3b. New collapsible address section in the form

Insert immediately AFTER the Email FormField row (line 1170, the closing `</div>` of the Mobile/Email grid) and BEFORE the Table/Seat grid (line 1172):

```tsx
{(selectedEvent as any)?.collect_guest_addresses === true && (
  <>
    {/* Mailing Address - full width */}
    <FormField
      control={form.control}
      name="mailing_address"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Mailing Address</FormLabel>
          <FormControl>
            <Input
              placeholder="Street address"
              className="rounded-full border-2 border-primary focus-visible:border-primary focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none h-9"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* Suburb + State - 2 col on sm+, stacked on mobile */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField name="mailing_suburb" ... label="Suburb" placeholder="Suburb" />
      <FormField name="mailing_state"  ... label="State"  placeholder="State"  />
    </div>

    {/* Postcode - own row, half-width on sm+, full on mobile */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField name="mailing_postcode" ... label="Postcode" placeholder="Postcode" />
    </div>
  </>
)}
```

All inputs reuse the existing `rounded-full border-2 border-primary ... h-9` styling — zero new CSS, zero drawer width changes. Section renders nothing (no spacing reserved) when toggle is off.

### 3c. Save behavior (lines ~667–711)

Extend `guestData` and `finalGuestData` builders so addresses persist on both Add and Edit:

```ts
const hasAnyAddress = !!(
  data.mailing_address?.trim() ||
  data.mailing_suburb?.trim() ||
  data.mailing_state?.trim() ||
  data.mailing_postcode?.trim()
);

const guestData = {
  ...existing,
  mailing_address:  data.mailing_address  || null,
  mailing_suburb:   data.mailing_suburb   || null,
  mailing_state:    data.mailing_state    || null,
  mailing_postcode: data.mailing_postcode || null,
  address_received: hasAnyAddress,
};
```

Saved unconditionally — even when the toggle is OFF the form just submits the existing (untouched) values, so previously-stored addresses are preserved silently and never erased.

## 4. Out of scope (do NOT touch in Phase 2)

GuestLookup / Live View, EnhancedGuestCard, GuestListTable columns, RSVP/seating/QR logic, invitations, SMS/email, exports/imports, Google Places, postal validation, country selector, family/couple sharing of addresses (always per-guest).

## Verification

1. Toggle OFF → no address fields appear in Add or Edit drawer; no spacing reserved.
2. Toggle ON → 4 fields render (Address full width, Suburb+State 2-col, Postcode 1/2 width on desktop, all stacked on mobile); drawer width unchanged.
3. Add Guest with addresses → DB row has values + `address_received = true`.
4. Add Guest with all address fields blank → DB row has `null`s + `address_received = false`.
5. Edit Guest pre-fills existing addresses; saving updates them and recomputes `address_received`.
6. Toggle OFF after addresses saved → reopen Edit drawer → fields hidden, but saving unrelated changes preserves stored address values (no erase).
7. No regressions to existing Mobile/Email/Table/Seat/RSVP/Dietary/Relation/Notes flows.
