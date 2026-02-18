
## Align Green Circle Numbers and Clean Up Box 4

### Changes Summary

1. **Align green circles 3 and 4** with circles 1 and 2 -- move them to the top of their boxes using `items-start` alignment on the circle row
2. **Center the Add Guest button** in box 4 (both horizontally and vertically)
3. **Remove the duplicate Add Guest button** next to Import/Export CSV (lines 1730-1755)
4. **Change box 4 background to white** -- remove `bg-primary/10` class

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Change 1 -- Box 4 styling (lines 1590-1604)**
- Remove `bg-primary/10` from box 4's class to make background white
- Change `items-start` to `items-center` and add `justify-center flex-1` so the Add Guest button is centered in the box
- Restructure so the green circle + text stays at the top and the button centers in the remaining space

**Change 2 -- Remove duplicate Add Guest button (lines 1730-1755)**
- Delete the entire Add Guest / Add First Guest button block that sits next to Import/Export CSV
- Keep Sort By and Import/Export CSV buttons intact

**Change 3 -- Align green circles (lines 1407-1408, 1433-1434, 1477-1478, 1591-1592)**
- The green circles in boxes 3 and 4 appear lower because the text next to them wraps. Adding `items-start` to the flex row ensures circles align to the top consistently. Boxes 1 and 2 already have short labels so they appear aligned. The fix is to ensure all four circle rows use `items-start` so multi-line text doesn't push the circle down.
