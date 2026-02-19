
# Edit Guest Modal: Move RSVP Invite Status Badge and Remove Family Group

## Changes

### 1. Move "Not Sent" badge inline with "RSVP Invite Status" label
Currently the badge sits below the label on its own line. It will be moved to sit on the same line, to the right of the "RSVP Invite Status" text.

**Before:**
```
RSVP Invite Status
[Not Sent]
```

**After:**
```
RSVP Invite Status    [Not Sent]
```

### 2. Remove Family Group field from Edit mode
The Family Group combobox (lines 1337-1360) will be deleted entirely from the Edit Guest form. Users who want to create couples or families can do so from scratch, which is simpler.

## Technical Details

**File: `src/components/Dashboard/AddGuestModal.tsx`**

1. **RSVP Invite Status section (lines 1120-1142):** Change from a vertical `space-y-1` layout to a horizontal `flex items-center gap-2` layout, placing the label and badge on the same row.

2. **Family Group section (lines 1337-1360):** Delete the entire `{isEdit && (...)}` block containing the `FamilyGroupCombobox`. Also clean up any related save-handler logic for `family_group` if it becomes unreachable, and remove the `FamilyGroupCombobox` import if no longer used elsewhere.
