## Permanent Account IDs + Unique Event IDs (amended)

### 1. Database migration

**`profiles` table:**
- Add `country_code text` (ISO-2, uppercase; nullable, defaults to `XX` when unknown).
- Add `account_id text` (will become `NOT NULL` after backfill).
- Unique index `profiles_account_id_unique` on `account_id` — this index is the **final authority** preventing duplicates.

**`events` table:**
- Add `event_id text` (will become `NOT NULL` after backfill).
- Unique index `events_event_id_unique` on `event_id` — final authority preventing duplicates.

**Generator functions (SECURITY DEFINER, search_path=public):**
- `generate_account_id(_country text) returns text`
  - Charset `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`, length **8**, generated from `gen_random_bytes(8)` (cryptographic).
  - Loops up to 50 attempts, checking `NOT EXISTS (SELECT 1 FROM profiles WHERE account_id = candidate)`.
  - Returns `UPPER(COALESCE(NULLIF(_country,''),'XX')) || '-' || random8`.
  - Example: `AU-7K29X8QF`.
- `generate_event_id() returns text`
  - Same charset, length **8**, prefix `EV-`. Collision check against `events.event_id`.
  - Example: `EV-4K2M9AZ7`.

**BEFORE INSERT triggers (server-side, ignore client values):**
- `profiles_set_account_id`: **always overwrites** with `generate_account_id(NEW.country_code)` — `NEW.account_id := generate_account_id(...)` runs unconditionally, so any value the client sends is discarded. Client cannot inject a custom ID.
- `events_set_event_id`: same pattern — `NEW.event_id := generate_event_id()` unconditionally.
- (For backfill we temporarily skip the trigger by using `ALTER TABLE ... DISABLE TRIGGER` for that one statement, then re-enable; or, equivalently, set the value inside the trigger only when `NEW.account_id IS NULL OR NEW.account_id !~ '^[A-Z]{2}-[A-Z0-9]{8}$'` — both keep client-supplied values from being honoured. The plan uses the unconditional-overwrite version for simplicity and maximum safety.)

**BEFORE UPDATE immutability triggers:**
- `profiles_account_id_immutable` and `events_event_id_immutable`: `RAISE EXCEPTION` if value changes after creation.

**One-time backfill (same migration, runs before NOT NULL):**
- `UPDATE profiles SET account_id = generate_account_id(COALESCE(country_code,'XX')) WHERE account_id IS NULL;`
- `UPDATE events SET event_id = generate_event_id() WHERE event_id IS NULL;`
- Loop: re-run until 0 rows remain (defensive against any insert-during-migration race).

**Lock down columns after backfill:**
- `ALTER TABLE profiles ALTER COLUMN account_id SET NOT NULL;`
- `ALTER TABLE events ALTER COLUMN event_id SET NOT NULL;`

**RLS:** existing policies on `profiles` / `events` already cover the new columns (own-row read). No policy changes needed. Because the triggers overwrite client input on INSERT and block any UPDATE, RLS need not police these specific columns separately — the unique indexes + triggers are the source of truth.

### 2. Country detection on signup

- New util `src/lib/countryFromLocale.ts`: maps `Intl.DateTimeFormat().resolvedOptions().timeZone` and `navigator.language` region to an ISO-2 country code. Falls back to `XX`.
- In existing signup flow (`SignUpModal` / `EmbeddedSignUpForm`), after the auth user is created, write `country_code` (only) to the new `profiles` row. The DB trigger then generates `account_id` server-side. No client-side ID generation anywhere.

### 3. Frontend display (minimal, scoped)

**`src/hooks/useProfile.ts`** — extend `UserProfile` with `account_id: string | null` and `country_code: string | null` (read-only).

**`src/components/Dashboard/AppSidebar.tsx`** (sidebar footer profile area, ~line 199) — add one small line under the user name:
```tsx
{profile?.account_id && (
  <span className="text-[11px] text-muted-foreground/80 truncate">
    Account ID: {profile.account_id}
  </span>
)}
```
No other layout changes. Works PC/tablet/mobile.

**`src/components/Account/AccountInfoCard.tsx`** — add a read-only `Row label="Account ID" value={profile?.account_id || '—'}`.

**`src/components/Dashboard/EventsTable.tsx`** (My Events page only)
- Extend local `Event` interface with `event_id?: string | null`.
- **Desktop/tablet table:** insert `<TableHead className="w-24">Event ID</TableHead>` between Countdown and Event Name, plus a matching `<TableCell>` rendering `event.event_id` in `font-mono text-xs text-muted-foreground`.
- **Mobile card view:** add a small line under the event name: `<p className="text-xs font-mono text-muted-foreground">{event.event_id}</p>`. No layout restructuring.

**`src/hooks/useEvents.ts`** — confirm the events query returns `event_id` (likely already `select('*')`). If `get_events_with_guest_count` RPC is used and doesn't include `event_id`, update the RPC return columns in the same migration.

### 4. Explicitly NOT changed
- Internal `events.id` (uuid) PK and every FK/join/realtime channel stay exactly as today. `event_id` is a display/lookup string only.
- No styling, spacing, colors, buttons, or other pages touched.
- All locked pages remain untouched aside from the two tiny additions above (sidebar footer line + My Events column).

### 5. Security & guarantees
- **Server-side only:** triggers overwrite any client-supplied `account_id` / `event_id`, so the frontend cannot dictate IDs.
- **Crypto-random:** 8 chars × 36 charset = ~2.8 × 10¹² combinations per country prefix → astronomically low collision probability.
- **Unique indexes are final authority:** any race that produced a duplicate would fail the INSERT; the generator's retry loop transparently retries on conflict.
- **Immutable:** UPDATE triggers raise an exception if either ID is changed.
- **NOT NULL after backfill:** schema-level guarantee that every account/event has an ID forever.

### Technical summary
- 1 SQL migration: 2 columns added to `profiles`, 1 column to `events`, 2 generator functions, 4 triggers (2 INSERT-overwrite, 2 UPDATE-immutability), 2 unique indexes, backfill loop, 2 `SET NOT NULL`, optional RPC return-columns update.
- 4 small frontend edits: `useProfile.ts`, `AppSidebar.tsx`, `EventsTable.tsx`, `AccountInfoCard.tsx`.
- 1 new util: `src/lib/countryFromLocale.ts`.
- 1 small signup patch to write `country_code` only.
