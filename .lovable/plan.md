

## Plan: "+ Guest" Toggle Feature

### Overview
Add a per-guest `allow_plus_one` boolean column and a new "+ Guest" column in the guest list table. The column header is clickable to toggle all guests on/off. The "Add Guest" button on the Live View guest card is conditionally shown based on this setting.

### 1. Database Migration
Add `allow_plus_one` column to the `guests` table:
```sql
ALTER TABLE public.guests ADD COLUMN allow_plus_one boolean NOT NULL DEFAULT true;
```
Default `true` so existing guests retain current behavior.

### 2. Update Guest Interface (`src/hooks/useGuests.ts`)
Add `allow_plus_one?: boolean` to the `Guest` interface.

### 3. Guest List Table (`src/components/Dashboard/GuestListTable.tsx`)

**New column header** between Email and RSVP Invite:
- Header shows "+ Guest" text with a clickable toggle icon
- Clicking the header toggles ALL guests' `allow_plus_one` on/off via a batch update
- Uses a YES/NO pill style matching Mobile/Email columns

**New column cell** for each guest row:
- Shows a clickable YES/NO pill (green YES / red NO)
- Clicking toggles that individual guest's `allow_plus_one` value
- Update `colSpan` values from 14 to 15

### 4. Live View Guest Card (`src/components/GuestLookup/EnhancedGuestCard.tsx` + `src/pages/GuestLookup.tsx`)

**Conditionally show "Add Guest" button:**
- Pass `onAddGuest` prop only when the guest's `allow_plus_one` is `true`
- Since the Live View fetches guests with `select('*')`, the new column will be available automatically

### 5. Files Changed
- **Migration**: Add `allow_plus_one` column to `guests`
- `src/hooks/useGuests.ts`: Add field to interface
- `src/components/Dashboard/GuestListTable.tsx`: Add column header (clickable toggle-all), add cell with per-guest toggle, update colSpan
- `src/pages/GuestLookup.tsx`: Conditionally pass `onAddGuest` based on `allow_plus_one`

