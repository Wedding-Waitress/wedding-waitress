
# Bulk Actions Bar: Remove "Assign Table", Single Line, Move Higher

## Changes

### 1. Remove "Assign Table" button
Delete the "Assign Table" button and its separator (lines 60-69). Also remove `onAssignTable` from the props interface and destructuring, and the `MapPin` icon import.

### 2. Fit everything on one line
Currently `flex-wrap` causes wrapping to a second line. Remove `flex-wrap` and reduce padding/gaps so all remaining items (Selected, Select All, Update RSVP, Delete, Send Email, Send SMS, Cancel) fit on one row. Also remove the separators between groups to save space, and reduce button text size slightly.

### 3. Move the bar higher on screen
Change `bottom-6` to `bottom-16` to move the purple bar up from the bottom of the screen.

## Technical Details

**File: `src/components/Dashboard/GuestBulkActionsBar.tsx`**

- Remove `MapPin` from imports (line 3)
- Remove `onAssignTable` from interface (line 10) and destructuring (line 25)
- Delete the "Assign Table" button block (lines 61-69)
- Change container class: `bottom-6` to `bottom-16`, remove `flex-wrap`, reduce `gap-4` to `gap-2`, reduce `px-6 py-4` to `px-4 py-3`
- Remove extra separators to save horizontal space (keep only key dividers)
