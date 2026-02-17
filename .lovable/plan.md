

## Rearrange Guest List Layout

### Current Layout
- **Row 1**: Choose Event selector + Search box (side by side)
- **Row 2**: Type of Event box + Guest Relations box (side by side, below)

### New Layout
- **Row 1**: Choose Event selector + Type of Event box + Guest Relations box (all three side by side)
- **Row 2**: Search box (moved directly under Choose Event)

### Technical Changes

**File**: `src/components/Dashboard/GuestListTable.tsx`

1. **Remove the search field** from inside the Choose Event row (lines 1400-1409)
2. **Move the search field** to a new row immediately after the main row, sitting below the Choose Event area
3. **Move boxes 2 and 3** (Type of Event + Guest Relations) from their current position below into the same flex row as Choose Event
4. All three sections will sit side by side on desktop, with boxes 2 and 3 having equal width (flex-1), stacking on mobile

No styling, content, or functionality changes -- purely a layout reorder.

