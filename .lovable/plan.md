

## Restore and Update Step Number Circles

### What Changes

The green step circles (1, 2, 3) in the onboarding boxes currently only show when `totalGuestCount === 0`. They will be changed to **always show**, and the text will change from "1st/2nd/3rd" to just "1/2/3". A 4th green circle with "4" will be added to the right of the "Add Guest" button.

### Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Box 1 - Choose Event (line 1408-1410)**
- Remove the `totalGuestCount === 0 &&` condition so the circle always renders
- Change the text from `1st` to `1`
- Increase font size from `text-xs` to `text-sm font-bold` for better visibility inside the circle

**Box 2 - Type of Event (line 1436-1438)**
- Remove the `totalGuestCount === 0 &&` condition
- Change text from `2nd` to `2`
- Same font styling update

**Box 3 - Guest Relations (line 1482-1484)**
- Remove the `totalGuestCount === 0 &&` condition
- Change text from `3rd` to `3`
- Same font styling update

**Add Guest Button (lines 1721-1745)**
- Add a green circle with "4" to the right of the Add Guest button (after the button, inside the flex container)
- Same circle styling: `bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0`

All four circles will use the same consistent green (`bg-green-500`) and size (`w-8 h-8`).
