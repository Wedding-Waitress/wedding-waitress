

## Update GroupTypeDialog Border Colors to Match Category Tablets

### Change

In `src/components/Dashboard/GroupTypeDialog.tsx`, update the border colors on both buttons to use the stronger orange and blue that match the Couples and Families tablet buttons in the stats bar.

**Couple button (line 44-45):**
- Change `border-orange-300 hover:bg-orange-50` to `border-orange-500 hover:bg-orange-50`
- This matches the `bg-orange-500` used for the Couples tablet

**Family button (line 56-57):**
- Change `border-blue-300 hover:bg-blue-50` to `border-blue-600 hover:bg-blue-50`
- This matches the `bg-blue-600` used for the Families tablet

Two class changes in one file. Nothing else is modified.

