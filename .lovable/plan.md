
Goal: fix the partner-name sync at the data source so changing Partner 1 / Partner 2 updates everywhere consistently, including Full Seating Chart after refresh.

1. Root cause confirmed
- Guest List is showing the new names because it recomputes the badge text live from:
  - `guest.relation_partner`
  - `guest.relation_role`
  - current event `partner1_name` / `partner2_name`
- Full Seating Chart is showing old names because it reads stored `guests.relation_display`.
- So the app currently has two sources of truth:
  - live-computed display in Guest List
  - persisted `relation_display` in other modules
- That mismatch is why Guest List looks correct while Full Seating Chart still shows old names like Hossam / Reema after refresh.

2. Backend fix I would implement
- Add a Supabase migration that creates a database-side sync function to rebuild `guests.relation_display` for an event from:
  - `guests.relation_partner`
  - `guests.relation_role`
  - `events.partner1_name`
  - `events.partner2_name`
  - `events.custom_roles` for custom labels
- Add a trigger on `events` so whenever partner names change, all affected guest `relation_display` values are regenerated automatically.
- This makes the database the single source of truth and fixes all pages that rely on `relation_display`, including refreshes and public/shared seating chart views.

3. App-side hardening
- Update the Guest List “Save Names” flow to rely on the backend sync instead of only doing many per-guest client updates.
- Keep the current success UX, but after saving:
  - refresh events
  - refetch guests
- This ensures the UI immediately reflects the database-synced values.

4. Full Seating Chart safety pass
- Review the Full Seating Chart data path only, without changing its layout:
  - `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`
  - `src/lib/fullSeatingChartPdfExporter.ts`
  - `src/pages/SeatingChartPublicView.tsx`
  - `supabase/migrations/...get_seating_chart_by_token...`
- If needed, add a safe fallback so relation text prefers synced data and never falls back to stale names.
- No typography, spacing, A4 measurements, or locked print layout rules would be changed.

5. Technical implementation details
- Likely touch:
  - `src/components/Dashboard/GuestListTable.tsx`
  - new Supabase migration for sync function + trigger
- The sync function will preserve:
  - standard roles like Guest, Cousin, Vendor
  - custom roles from `events.custom_roles`
  - empty relations staying empty
- I would avoid changing `src/integrations/supabase/types.ts` manually.

6. Validation after implementation
- Save Partner 1 / Partner 2 as new names in Guest List.
- Confirm Guest List badges update.
- Refresh the page completely.
- Open Full Seating Chart and verify old names no longer appear.
- Check PDF export and public/shared seating chart view.
- Confirm switching back to Bride/Groom also syncs correctly.
- Confirm end-to-end that renamed partners appear consistently across pages after refresh.

Expected result
- Changing partner names once will update the stored relation text for the whole event.
- Full Seating Chart, public seating chart, exports, and any other page using `relation_display` will stay in sync with the names saved in Box 3.
