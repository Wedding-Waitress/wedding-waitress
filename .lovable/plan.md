

## Convert Guest List Setup to 3 Equal Sections

**What**: Replace the current 2-column layout (lines 1470-1674) with a 3-column equal-width grid. Move the relationship settings from inside Box 1 into its own dedicated Box 2. The current Box 2 (Add Guest) becomes Box 3.

### File to edit

**`src/components/Dashboard/GuestListTable.tsx`** (lines ~1470-1674)

### Changes

1. **Grid layout**: Change `md:grid-cols-2` to `md:grid-cols-3` on the container div (line 1470)

2. **Box 1 (Left) — Step 1: Set Up Your Event**
   - Keep title, subtext, Choose Event dropdown, and Event Type buttons exactly as-is
   - **Remove** the Guest Relationship Settings section from this box (lines 1533-1647) — it moves to Box 2

3. **Box 2 (Middle) — Step 2: Guest Relationship Settings**
   - New box with same border/shadow styling as the other two
   - Title: "Step 2: Guest Relationship Settings"
   - Subtext: "Optionally define how guests are related to you"
   - Move all existing relationship toggle + radio options + partner name inputs + Save Names button into this box
   - Keep the smooth expand/collapse animation exactly as-is
   - Show relationship content only when an event is selected (same conditional as current)

4. **Box 3 (Right) — Step 3: Add Your Guests**
   - Rename from "Step 2" to "Step 3"
   - Keep centered layout with + Add Guest button
   - Add helper text below button: "Guests will appear in the table below"
   - Keep the "no event selected" toast behavior

### Styling rules (all 3 boxes)
- Same classes: `border-2 border-primary rounded-xl p-5 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`
- Title: `text-base font-semibold text-foreground mb-0.5` (unchanged from current)
- Subtext: `text-sm text-muted-foreground mb-4`
- Equal height via `items-stretch` on the grid container (already present)

### What stays the same
- All functional logic (event selection, type toggle, partner name saving, add guest validation)
- All other sections of the page (stats bar, table, bulk actions, modals)
- No changes to any other files

