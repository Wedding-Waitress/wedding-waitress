
## Resize Category Buttons to Match Sort By / Import Export

### What Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

Four buttons need their height and font size updated to match the Sort By and Import/Export CSV buttons (h-7 / text-xs):

1. **Individuals** (pink) -- line 1566
2. **Couples** (orange) -- line 1569
3. **Families** (blue) -- line 1572
4. **Guests** (white with purple border) -- line 1588

### Current vs New

| Property | Current | New |
|----------|---------|-----|
| Height | `h-8 sm:h-9` | `h-7` |
| Font size | `text-xs sm:text-sm` | `text-xs` |

### What Stays the Same

- Pink background on Individuals
- Orange background on Couples
- Blue background on Families
- White background with purple border on Guests
- All text content and icons unchanged
- No other buttons or elements affected
