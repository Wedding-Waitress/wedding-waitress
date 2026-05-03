## Dashboard — Send Invitations Button Polish

### Bug fix note
The percentage math in `src/components/Dashboard/DashboardOverview.tsx` is already correct — both `percent` (line 59) and `percentLabel` (line 61) use `* 100`. No change needed there.

### Changes

**File:** `src/components/Dashboard/DashboardOverview.tsx`

1. **Update `goToGuestList` helper** to accept an optional `scrollToSend` flag. After tab navigation, wait ~250ms for the Guest List tab content to mount, then scroll to the existing `#guest-list-table-anchor` element (already present in `GuestListTable.tsx` line 1636).

2. **Disable "Send Invitations" button when no guests exist:**
   - `disabled={stats.total === 0}`
   - Add tooltip/title: `"Add guests first to send invitations"` when disabled
   - When enabled, call `goToGuestList(true)` so it scrolls to send section

3. **Activate RSVP button** (empty-state card) keeps current behavior — navigates to Guest List without scroll.

### Out of scope
- No changes to Guest List, RSVP logic, Stripe, or hooks
- No changes to percentage calculations (already correct)
