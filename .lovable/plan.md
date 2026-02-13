

## Add Step-by-Step Guidance Badges (1st, 2nd, 3rd) to Guest List Page

### Overview
Add three bright yellow "step number" badges to guide users through the required setup steps before they can add their first guest. Also update the event type buttons to turn green when selected, and restructure the partner names section with a toggle for keeping defaults vs entering custom names.

### Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

#### 1. Add "1st" Badge to Choose Event
- Add a yellow pill/tablet badge with bold red text "1st" to the left of the "Choose Event:" label (around line 1276)
- Style: `bg-yellow-400 text-red-600 font-extrabold text-lg px-3 py-1 rounded-lg`

#### 2. Add "2nd" Badge to Type of Event Box
- Add a yellow pill/tablet badge with bold red text "2nd" above the "Type of Event:" title inside Box 1 (around line 1313)
- Same yellow background, red text style as step 1

#### 3. Change Event Type Buttons to Green When Selected
- Update the Wedding-Engagement and Birthday-single person buttons (lines 1326-1347)
- When selected (active), change from `bg-primary` (purple) to `bg-green-500 text-white shadow-md`
- Keep the unselected style as-is (white with purple border)

#### 4. Add "3rd" Badge to Guest Relations Box + Toggle for Partner Names
- Add a yellow pill/tablet badge with bold red text "3rd" above the "Add what relation..." title inside Box 2 (around line 1352)
- Replace the current partner name inputs and hide toggle with a new toggle system:
  - **Option 1 (default):** "Leave Partner 1 and Partner 2 names as Bride and Groom" -- auto-saves "Bride" and "Groom" and sets `partnerNamesSaved = true`
  - **Option 2:** "Add new names for Partner 1 and Partner 2" -- reveals the existing Partner 1 and Partner 2 input fields
- When either option is toggled/selected, the "Add First Guest" button becomes active
- The existing "Hide what the guest relation is to you" toggle remains below

### Technical Details

- A new state variable `useDefaultNames` (boolean, default `true`) controls the toggle
- When `useDefaultNames` is true and the user hasn't changed anything, partner names default to "Bride"/"Groom" and `partnerNamesSaved` is set to `true` automatically
- When `useDefaultNames` is false, the existing partner name input fields appear and the existing blur-to-save behavior applies
- The step badges only appear when `totalGuestCount === 0` (no guests added yet), so they disappear after the first guest is added to avoid clutter
- All three badges use identical styling for consistency

### Visual Summary

```text
+------------------------------------------------------------------+
| Guest List                                                        |
|                                                                   |
| [1st] Choose Event: [Jason & Linda's Wedding v]  [Search...]     |
|                                                                   |
|   [2nd]                          [3rd]                            |
|   +-- Type of Event --+    +-- Add what relation... --+          |
|   | [Wedding] (GREEN)  |    | ( ) Keep as Bride/Groom  |          |
|   | [Birthday]         |    | ( ) Add new names        |          |
|   +--------------------+    |   Partner 1: [____]      |          |
|                             |   Partner 2: [____]      |          |
|                             +---------------------------+          |
+------------------------------------------------------------------+
```

