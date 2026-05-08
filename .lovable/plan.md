# Venue Referral & Network Growth — Phase 1

Elegant, low-friction venue referral built on top of the existing Create Event flow and Dashboard. Nothing about onboarding/signup changes; nothing nags.

## 1. Schema (single migration)

**Extend `events`** (additive, nullable — zero friction):
- `venue_contact_email text`
- `reception_venue_contact_email text` (mirrors existing `venue_contact` naming pattern)
- (Coordinator name reuses existing `venue_contact` / `ceremony_venue_contact` — no new column.)

**New table `venue_invitations`**:
- `event_id` (fk events, on delete cascade)
- `account_id` / `user_id` (referring account)
- `venue_name text`
- `venue_email text not null`
- `venue_contact_name text`
- `status text` default `'sent'` (sent | bounced | opened | converted — only `sent` written in Phase 1)
- `sent_at timestamptz default now()`
- `created_at`, unique `(event_id, venue_email)`

**New table `event_referral_dismissals`**:
- `user_id`, `event_id`, `dismissed_at`, `snooze_until timestamptz` (nullable)
- PK `(user_id, event_id)`

**RLS**: owner-only select/insert/update on both new tables (master role per existing `is_account_master` pattern for `venue_invitations` insert).

## 2. Event Create modal

`src/components/Dashboard/EventCreateModal.tsx` — add an optional collapsible block at the bottom of the Reception section:

> **Venue Coordinator (optional)**
> - Coordinator Name (reuses `venue_contact`)
> - Coordinator Email (`venue_contact_email`) — type=email, no required, no inline validation pressure

Same minimal block in `EventEditModal.tsx`. Mobile rules followed (full-width, h-11, gap-5).

## 3. First-event detection + referral card

New hook `useFirstEventReferral(events)`:
- "First event" = the user's earliest event by `created_at` AND total event count === 1, OR — for users with multiple events — the most recently created event whose dismissal row doesn't exist yet (only surfaces once).
- Hidden if a row exists in `event_referral_dismissals` for that event with `snooze_until` null (dismissed forever) or `snooze_until > now()`.

New component `src/components/Dashboard/VenueReferralCard.tsx`:
- Rendered on the **Dashboard Overview** tab only, above existing cards, and on the **My Events** page after a successful create (one-time inline confirmation banner).
- Compact `dashboard-card` with small purple/brown venue icon, headline "Using a participating venue?", body copy from spec, two actions:
  - `Invite My Venue` (premium primary, `lv-premium-shade`)
  - `Not now` (ghost) → writes dismissal with `snooze_until = now() + 14 days`
  - small `×` → permanent dismiss (no snooze)
- Mobile: stacks, full-width buttons, `px-4`.

## 4. Invite Venue modal

`src/components/Dashboard/InviteVenueModal.tsx` (follows locked Mobile Modal System):
- Prefills `venue_name` from event, `venue_email` + `venue_contact_name` from event venue fields if present.
- Two inputs (email required, name optional) + read-only preview of the invitation copy.
- Footer: green **Send Invitation** left, red **Cancel** right.
- On submit: insert into `venue_invitations`, invoke edge function `send-venue-invitation`, toast success, persist any newly-entered email back onto `events.venue_contact_email` for reuse.

## 5. Edge function `send-venue-invitation`

- Auth: requires user JWT; verifies caller owns `event_id`.
- Renders an elegant React Email template `venue-invitation.tsx` under `_shared/transactional-email-templates/`:
  - Subject: "An invitation to explore Wedding Waitress"
  - Body tone per spec — couple is using WW, venue may benefit; bullets: guest management, RSVP coordination, planning workflows, seating management, operational efficiency. No pricing, no "free", no urgency. Signed off with the couple's names + event date.
  - CTA button → `https://weddingwaitress.com/for-venues?ref=<event_id>` (existing public domain).
- Sends via the existing transactional queue (`send-transactional-email`) — no new email infra.
- Logs send into `email_send_log` automatically via the queue.

## 6. Vendor Pro positioning

Subtle one-line footer inside the invitation email and the referral card: *"Built for couples, planners, and venues coordinating events together."* No plan names, no pricing, no enterprise jargon.

## 7. Files

**New**
- `supabase/migrations/<ts>_venue_referrals.sql`
- `src/components/Dashboard/VenueReferralCard.tsx`
- `src/components/Dashboard/InviteVenueModal.tsx`
- `src/hooks/useFirstEventReferral.ts`
- `src/hooks/useVenueInvitations.ts`
- `supabase/functions/send-venue-invitation/index.ts`
- `supabase/functions/_shared/transactional-email-templates/venue-invitation.tsx` + registry entry

**Edited (minimal, additive only)**
- `src/components/Dashboard/EventCreateModal.tsx` — optional coordinator email field
- `src/components/Dashboard/EventEditModal.tsx` — same
- `src/components/Dashboard/DashboardOverview.tsx` — render `<VenueReferralCard/>` at top when hook returns an event

## 8. Guardrails honored
- No locked surfaces touched (Landing, public pages, locked Dashboard shell utilities, GuestListTable, EventsTable layout).
- No signup/onboarding interruption — card only appears on Dashboard Overview after first event exists.
- No automatic emails — strictly user-initiated via the modal.
- Mobile rules, premium button shade, and modal system applied.
- Dismissible + snoozable; never re-prompts within 14 days; never re-prompts at all if `×` used.

## 9. Deliverable confirmation (post-implementation)
- Card appears on `/dashboard` overview once user has ≥1 event and no permanent dismissal.
- First-event detection via `useFirstEventReferral` (count + dismissal table).
- Invite flow: card → modal (prefilled) → edge function → queued email → row in `venue_invitations`.
- Stored data: `venue_invitations` (referral lineage) + `events.venue_contact_email` (reusable) + `event_referral_dismissals` (UX state).
- Zero changes to signup, auth, onboarding, or required event fields.
