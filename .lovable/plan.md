

## Move Search Box Next to "Guests" Pill

### What Changes

The "Search guests..." input field will be moved from its current position (below the Choose Event selector) to sit directly to the left of the "0 Guests" pill in the stats/controls row.

### Current Layout
- Row 1: Choose Event + Type of Event + Guest Relations (all side by side)
- Row 2: Search guests box (standalone below Choose Event)
- Row 3: [Individuals, Couples, Families] on left | [0 Guests, Sort By, Import/Export, Add Guest] on right

### New Layout
- Row 1: Choose Event + Type of Event + Guest Relations (unchanged)
- Row 2: [Individuals, Couples, Families] on left | [**Search guests**, 0 Guests, Sort By, Import/Export, Add Guest] on right

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx`

1. **Remove** the search field block at lines 1554-1563 (the standalone row below Choose Event)
2. **Insert** the search field inside the right-side controls div (line 1583), just before the "0 Guests" pill -- so it appears to the left of it

No other changes to styling, functionality, or content.

