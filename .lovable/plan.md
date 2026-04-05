

## Investigation: Table Tab Not Showing Content

### Root Cause Analysis

After examining the code, I found **two issues**:

1. **Adam has no table assigned** — Screenshot 1 clearly shows "No Table Assigned / Please see event staff". When clicking the Table tab, the code checks `filteredGuests.some(g => g.table_id)` which is `false`, so it falls through to show a "No Table Assigned Yet" card. This card likely **is rendering** but may be below the visible area, requiring a scroll. The "Home" button you see is always rendered regardless.

2. **Named tables bug (line 845)** — Even for guests who DO have a table assigned, if the table uses a name instead of a number (e.g., "VIP Table" where `table_no` is null/0), the visualization silently returns `null` because of this check: `tableGuest?.table_no ? (render) : null`. This breaks named table visualizations entirely.

### Proposed Fixes

**File**: `src/pages/GuestLookup.tsx`

#### Fix 1: Named tables support
Change the condition on line 845 from `tableGuest?.table_no ?` to allow tables identified by either `table_no` or `table_id`. Pass the table name as a fallback when `table_no` is missing.

#### Fix 2: Auto-scroll to content
When switching to the Table tab, auto-scroll the visualization content into view so the user immediately sees the table assignment (or the "No Table Assigned" message) without needing to manually scroll.

#### Fix 3: Improve empty state messaging  
Ensure the "No Table Assigned Yet" card is visually prominent when the guest has no table, so it's clear what's happening.

### Important Note
For Adam Saad specifically, the Table tab will correctly show "No Table Assigned Yet" because he genuinely has no table assigned in the system. If he should have a table, that needs to be set in the dashboard's Tables page first.

