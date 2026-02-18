
## Sort By Dropdown Styling Updates

### Summary

Three visual adjustments to the Sort By dropdown in the Guest List:

1. **Left-align** all items (remove centering) with proper left padding
2. **Color-code** Individuals (pink), Couples (orange), Families (blue), and Default (red) text and icons
3. Keep First Name, Last Name, and Table No. in the default text color

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Lines 1651-1661** -- Update the dropdown rendering:

- Remove `justify-center` from `DropdownMenuItem` className (revert to default left-aligned layout)
- Add color classes per option value:
  - `individuals_first`: `text-pink-500` (matches the Individuals pill `bg-pink-500`)
  - `couples_first`: `text-orange-500` (matches the Couples pill `bg-orange-500`)
  - `families_first`: `text-blue-600` (matches the Families group header `bg-blue-600`)
  - `default`: `text-red-500` (the red used throughout Wedding Waitress)
  - All others (`first_name`, `last_name`, `table_name`): no color override (default text color)

The color will be applied to both the icon and the label by setting the text color on the `DropdownMenuItem` itself, since the icon inherits `currentColor`.
