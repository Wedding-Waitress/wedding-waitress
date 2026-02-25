
# Fix Sidebar Logo Clipping

## Problem
The Wedding Waitress logo in the sidebar header is cut off at the top because it sits too high, partially hidden behind the dashboard header bar.

## Solution
Increase the top padding of the `SidebarHeader` in `src/components/Dashboard/AppSidebar.tsx` from `pt-4` to `pt-16` so the logo clears the fixed top header bar and is fully visible. No other elements will be affected.

## Technical Details

**File:** `src/components/Dashboard/AppSidebar.tsx` (line ~89)

Change:
```
<SidebarHeader className="pt-4 pb-12">
```
To:
```
<SidebarHeader className="pt-16 pb-12">
```

This single class change adds enough top spacing for the logo to appear fully below the fixed header bar.
