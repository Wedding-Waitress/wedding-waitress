

# Rename "Individual" to "Single" in Guest Category Labels

## Summary
Change the display label "Individual" to "Single" in three locations across the app, as shown in the screenshots.

## Changes

### 1. Guest List stats badge (`src/components/Dashboard/GuestListTable.tsx`)
- **Line 1626**: Change `{individualCount} Individual{individualCount !== 1 ? 's' : ''}` to `{individualCount} Single{individualCount !== 1 ? 's' : ''}`

### 2. Add New Guest modal (`src/components/Dashboard/AddGuestModal.tsx`)
- **Line 938**: Change the button text from `Individual` to `Single`

### 3. Add Extra Guest modal (Live View) (`src/components/GuestLookup/PublicAddGuestModal.tsx`)
- **Line 192**: Change the description text from `Individual` to `Single`
- **Line 211**: Change the button text from `Individual` to `Single`

All internal logic values (`'individual'`) remain unchanged -- only the user-facing display labels are updated.

