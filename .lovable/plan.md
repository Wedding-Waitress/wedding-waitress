
## Goal

7 days before `events.date`, automatically hide guest-facing actions in Live View:
- RSVP Accept / Decline
- Add +1 Guest
- Update Your Details
- Guest edit modal

Organiser can manually re-enable any of these inside **QR Code Seating Chart → Guest Live View Configuration**. If re-enabled, the buttons appear and function normally.

Search, QR seating lookup, welcome media, floor plans, menu, ceremony/reception details, and event-day table lookup are **not affected**.

## Note on existing state

There is currently no "24 hours before event" rule in the codebase — the only Live View edit lock is the manual `events.rsvp_deadline` (full-day inclusive). This plan introduces the 7-day auto-protection as a new layer that sits **on top of** the existing `rsvp_deadline` and the existing Live View Configuration toggles (`show_rsvp_invite`, `show_update_details`, allow-plus-ones), without changing them.

## Behaviour

For each gated action, compute on the public Live View:

```
isWithin7Days  = event.date is today or within the next 7 calendar days (event timezone)
manualOverride = organiser has flipped the per-action "Keep available in last 7 days" override ON
visible        = existingToggleOn && (!isWithin7Days || manualOverride) && !rsvpDeadlinePassed
```

Three independent overrides (one per action), default OFF:
- `rsvp_override_auto_lock`
- `plus_one_override_auto_lock`
- `update_details_override_auto_lock`

Stored in the existing `live_view_module_settings` table inside the relevant `*_config` JSON (no schema change required) — keeps it adjacent to the matching module config and avoids a migration.

## UX

**Live View (guest)**
- Within the 7-day window, the affected buttons are **fully hidden** (not greyed out): Accept, Decline, Add +1 Guest, Update Your Details. The card still shows name, table, seat, dietary, RSVP status badge.
- No "locked" copy is shown — clean, intentional.

**QR Code Seating Chart → Guest Live View Configuration (organiser)**
For each of the three modules (RSVP Invite, Update Details, +1 Guests), add a small secondary row beneath the existing visibility toggle:

```
[ ✓ ] Keep available during 7-day auto-protection
       By default, this is hidden from guests in the final week
       before your event. Turn ON to keep it available.
```

When the main module toggle is OFF, the override row is disabled/dimmed.

A subtle banner at the top of the Live View Configuration panel:
> "Auto-protection: RSVP, +1, and Update Details are automatically hidden from guests in the 7 days before your event. Use the toggles below to override per action."

## Files to change

1. `src/hooks/useLiveViewModuleSettings.ts` — extend default config shape (no DB migration needed; JSON additive).
2. `src/components/Dashboard/QRCodeSeatingChart/...` Live View Configuration panel (or wherever `show_rsvp_invite`, `show_update_details`, allow-plus-ones live) — add the three override toggles + banner.
3. `src/pages/GuestLookup.tsx` —
   - Add `isWithin7Days` memo from `event.date` (timezone-aware via existing event timezone helper).
   - Compute `effectiveShowRsvpInvite`, `effectiveShowUpdateDetails`, `effectiveAllowPlusOne` and pass to `EnhancedGuestCard` / Update modal trigger.
4. `src/components/GuestLookup/EnhancedGuestCard.tsx` — accept new props `showRsvpButtons`, `showAddPlusOne`, `showUpdateDetails` and conditionally render Accept/Decline, Add +1, and Update Your Details. Existing `isEditable` (rsvp_deadline) logic preserved as an additional gate.
5. `src/hooks/useLiveViewVisibility.ts` — surface the three new override fields (read-through from module settings) so the public RPC payload carries them.
6. Public RPC `get_public_event_with_data_secure` — confirm it already returns `live_view_module_settings` JSON; if not, expose the three override booleans (read-only). No write path from public.

## Out of scope (explicitly unchanged)

- Guest search behaviour, QR seating lookup
- Welcome / invite videos, hero image
- Ceremony / reception details, floor plans, menu
- Event-day table lookup
- Existing `live_view_settings` visibility toggles
- `events.rsvp_deadline` lock
- Security RPCs and RLS

## Edge cases

- No `event.date` set → auto-protection does not apply.
- Event date in the past → auto-protection does not apply (post-event behaviour unchanged).
- `rsvp_deadline` already passed → buttons remain hidden regardless of overrides (existing behaviour wins).
- Toggling an override OFF after re-enabling immediately re-hides for new visitors (live via realtime subscription on `live_view_module_settings`).
