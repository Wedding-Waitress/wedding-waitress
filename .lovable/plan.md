# Remaining Security Hardening — Plan

Four remaining findings. Each addressed below with scope, approach, and risk.

---

## 1. `admin_otp_codes` — document intentional "no policy" state

**Finding:** RLS on, zero policies = no API access. This IS the desired posture (only edge functions using the service role read/write OTP codes). Risk is that a future migration accidentally adds a policy that exposes `code_hash`.

**Fix:**
- Add a permanent SQL `COMMENT ON TABLE public.admin_otp_codes` explaining: "Intentionally has no RLS policies. All access is via SECURITY DEFINER edge functions using the service role. Do NOT add anon/authenticated policies — would expose OTP code hashes."
- Update `mem://architecture/security-rpc` memory to record the rule.
- Mark finding fixed with that explanation.

**Risk:** None. Documentation only.

---

## 2. innerHTML usage in chart exporters — defense-in-depth HTML escaping

**Files (7 call sites):**
- `src/lib/tableChartEngine.ts` (2)
- `src/lib/individualTableChartEngine.ts` (3)
- `src/lib/individualTableChartDocxExporter.ts` (1)
- `src/components/Dashboard/PlaceCards/PlaceCardExporter.tsx` (1)

**Approach:**
- Create `src/lib/security/escapeHtml.ts` exporting `escapeHtml(text)` and `escapeXml(text)` (same map: `& < > " '`).
- Audit each engine's SVG/HTML template builders and wrap every interpolated user field — guest first/last name, table name, custom captions, event name, venue, partner names, dietary text, notes — with `escapeHtml()`.
- Leave the `innerHTML` assignment itself in place (off-screen render is required by html2canvas/jsPDF). Escaping the inputs eliminates the XSS vector.
- No behavior change for normal data; characters like `&`/`<`/`>` will now render as text instead of being interpreted as markup (which is what users actually want anyway).

**Risk:** Very low. Visual output unchanged for all real-world names. PDF/PNG exports remain pixel-identical except in the rare case where a user typed literal HTML, where the new behavior is correct.

---

## 3. Public RPC event metadata exposure — opt-in privacy controls

**Finding:** `get_public_event_with_data_secure(event_slug)` returns event name, date, venue, partner names to anyone with a valid slug (gated only by `qr_apply_to_live_view = true`).

**Approach (minimal, non-breaking):**
- Add three new boolean columns on `events` (all default `true` to preserve current behavior):
  - `public_show_venue`
  - `public_show_partner_names`
  - `public_show_date`
- Update the RPC `get_public_event_with_data_secure` to return `NULL` for any field whose toggle is `false`. Event name and slug always returned (needed for the page to render at all).
- Add a small "Privacy" sub-section in the existing live-view settings UI (Dashboard → Kiosk Live View settings) with three pill toggles, matching the locked mobile modal toggle style.
- No rate-limiting work this round (would require an IP tracking table + edge function rewrite — separate effort).

**Risk:** Low. Defaults preserve existing public output. Guest lookup keeps working unchanged unless the owner deliberately hides fields.

---

## 4. Realtime channel authorization — lock down per-user/event subscriptions

**Finding:** `events`, `guests`, `running_sheet_items`, `running_sheet_share_tokens` are in `supabase_realtime` publication with no RLS on `realtime.messages`. Any signed-in user can subscribe to any topic and receive row change events for other users' data (names, emails, phones, dietary).

**Approach — table RLS already enforces row visibility for Postgres Changes:**

Supabase Realtime "Postgres Changes" already filters payloads through the subscriber's RLS on the source table. So the actual risk is twofold:

a. **Broadcast/Presence channels** (e.g. `kiosk-guests:event:${eventId}`) — these are NOT Postgres Changes; they're free-form topics. We need RLS on `realtime.messages` so a user can only join a topic for an event they own/collaborate on.

b. **Public/anon access** to `qr_apply_to_live_view` events still needs to work for the kiosk + guest lookup pages.

**Fix:**
- Enable RLS on `realtime.messages`.
- Create a SECURITY DEFINER helper `public.realtime_can_access_topic(topic text)` that parses the topic (formats: `kiosk-guests:event:{uuid}`, `dashboard-rs-items:{uuid}`, `dashboard-rs-meta:{uuid}`) and returns `true` if:
  - caller is the event/sheet owner, OR
  - caller is a collaborator (`event_collaborators`), OR
  - the event has `qr_apply_to_live_view = true` (public kiosk/guest lookup), OR
  - caller has admin role.
- Add SELECT + INSERT policies on `realtime.messages` calling that helper against `realtime.topic()`.
- Verify in code that all 3 known channels (`kiosk-guests:event:${eventId}`, `dashboard-rs-items:${sheet.id}`, `dashboard-rs-meta:${sheet.id}`) match the parser.
- Keep Postgres Changes intact — they already inherit RLS.

**Risk:** Medium. If the topic parser misses a channel name format, that channel breaks silently. Mitigation: parser includes a fallback that allows topics starting with `lov:` / system topics, and we'll grep the codebase for every `.channel(` usage before deploying.

---

## Technical Summary (for the dev)

| # | Files / Objects | Change |
|---|---|---|
| 1 | `admin_otp_codes` (DB) | `COMMENT ON TABLE`; memory note |
| 2 | new `src/lib/security/escapeHtml.ts`; 4 exporter files | escape all user-data interpolations |
| 3 | `events` table (3 cols), `get_public_event_with_data_secure` RPC, live-view settings UI | opt-in privacy toggles |
| 4 | `realtime.messages` RLS + `public.realtime_can_access_topic` helper | per-topic auth |

---

## Order of execution

1. Migration A: admin_otp_codes COMMENT + family note (already done) → mark finding fixed.
2. HTML escaper + exporter edits.
3. Migration B: events privacy columns + RPC update + live-view settings UI.
4. Migration C: realtime.messages RLS + helper. Test all 3 known channels in dev.

After each step I'll mark the corresponding scanner finding as fixed with the exact remediation note.

Approve to proceed, or tell me to skip / reorder any item.