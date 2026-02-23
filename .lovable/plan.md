

# Mobile Experience Review and Improvements

## Current State Assessment

The codebase already has a solid mobile foundation:
- `useIsMobile()` hook (768px breakpoint)
- CSS utility classes for safe-area insets, touch targets, mobile scrolling
- `mobile-contain` class on the dashboard root to prevent horizontal overflow
- Hamburger menu button already at 44x44px (`h-11 w-11`)
- `overflow-x-hidden` on main content area

However, there are specific gaps that need addressing across four areas.

---

## Changes Required

### 1. Increase Tap Targets to Minimum 48x48px

**Files affected:**

**`src/components/ui/button.tsx`** (base shadcn button)
- `sm` size is `h-9` (36px) -- too small on mobile
- `default` size is `h-10` (40px) -- below 48px threshold
- Add a responsive mobile override: on screens below `sm` (640px), enforce `min-h-[48px]` on default and sm sizes

**`src/components/ui/enhanced-button.tsx`** (enhanced button)
- Same issue: `sm` = `h-9`, `default` = `h-10`
- Apply same fix

**`src/components/Dashboard/DashboardHeader.tsx`**
- Hamburger button is `h-11 w-11` (44px) -- increase to `h-12 w-12` (48px)

**`src/index.css`**
- Update `.touch-target` from `min-h-[44px] min-w-[44px]` to `min-h-[48px] min-w-[48px]`
- Update `.touch-target-lg` (already 48px -- fine)
- Add a global mobile rule: on small screens, all `button`, `a`, `[role="button"]`, `select`, `input` elements get `min-height: 48px`

### 2. Add Spacing Between Interactive Elements

**`src/components/Dashboard/NavigationTabs.tsx`**
- Current: `space-x-2` (8px gap) between tab buttons
- Change to `gap-3` (12px) on mobile for easier tapping

**`src/components/Dashboard/AppSidebar.tsx`**
- Sidebar menu items use `py-3` on desktop and `py-4` on mobile (already decent)
- Add `gap-1` between menu items for extra breathing room on mobile

**`src/components/Dashboard/StatsBar.tsx`** (LOCKED -- minimal change)
- Mobile horizontal scroll items use `gap-4` and `min-w-[72px]` -- already reasonable
- No changes needed here (respecting locked status)

**`src/index.css`**
- Add a global mobile spacing rule for common interactive containers

### 3. Ensure Text is Minimum 16px on Mobile

**`src/index.css`**
- Add a mobile base font-size rule: `@media (max-width: 639px) { body { font-size: 16px; } }`
- This also prevents iOS Safari zoom-on-focus for inputs (inputs below 16px trigger auto-zoom)

**`src/components/Dashboard/DashboardHeader.tsx`**
- Mobile greeting text is `text-sm` (14px) -- change to `text-base` (16px)

**`src/components/Dashboard/AppSidebar.tsx`**
- Menu item text is `text-base` (16px) -- already fine
- "Start Here" badge is `text-xs` (12px) -- this is a badge/label so acceptable

**`src/components/Dashboard/NavigationTabs.tsx`**
- Tab button text inherits from button `text-sm` (14px) -- add `text-base` on mobile via responsive class

### 4. Fix Horizontal Scroll on Small Screens

**`src/pages/Dashboard.tsx`**
- Main content already has `overflow-x-hidden` and `mobile-contain` -- good
- Table list section has `w-[300px]` hardcoded on SelectTrigger -- change to `w-full sm:w-[300px]` to prevent overflow on narrow screens

**`src/components/Dashboard/GuestListTable.tsx`**
- The guest table uses `table-fixed w-full` inside `overflow-x-auto` -- this is correct (allows horizontal scroll for the data table which is expected)
- Various button groups in the header area may overflow -- wrap them in `flex-wrap` containers

**`src/index.css`**
- The `.mobile-contain` class already handles `max-width: 100vw; overflow-x: hidden` -- confirm it's applied correctly

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/index.css` | Update touch-target to 48px, add global mobile min-height for interactive elements, set mobile body font-size to 16px |
| `src/components/ui/button.tsx` | Add responsive mobile min-height to button variants |
| `src/components/ui/enhanced-button.tsx` | Add responsive mobile min-height to button variants |
| `src/components/Dashboard/DashboardHeader.tsx` | Increase hamburger to 48px, bump mobile text to 16px |
| `src/components/Dashboard/NavigationTabs.tsx` | Increase button gap, add mobile text-base |
| `src/components/Dashboard/AppSidebar.tsx` | Add gap between sidebar menu items on mobile |
| `src/pages/Dashboard.tsx` | Fix hardcoded `w-[300px]` on SelectTrigger to be responsive |

---

## Technical Notes

- All changes are purely CSS/styling -- no logic or data changes
- Locked files (StatsBar, GuestListTable core logic) are not modified -- only minimal styling tweaks where necessary
- The GuestListTable data table intentionally scrolls horizontally on mobile (this is the standard pattern for wide data tables) -- this is NOT a bug
- iOS Safari auto-zoom is prevented by ensuring input font-size is at least 16px

