

## Fix "Add First Guest" Button Not Opening

### Root Cause
The "Add First Guest" button has a gating check that requires partner names to be saved before allowing the modal to open. The save function (`handleSavePartnerNames`) successfully writes "Bride" and "Groom" to the database when you leave (blur) the input fields, but it never updates the `partnerNamesSaved` state to `true`. So the button keeps blocking you.

The console logs confirm this -- every click triggers `addguest_blocked_missing_names`, meaning the gating logic fires every time.

### Fix
**File: `src/components/Dashboard/GuestListTable.tsx`** (inside `handleSavePartnerNames`, around line 381)

After the partner names are successfully saved to the database, add a check: if both names are filled, set `partnerNamesSaved` to `true` and clear the validation warning. This way, once you type both names and click away (or press Tab), the button will immediately become active.

### Technical Detail
After the `updateEvent()` call succeeds (line 381), add:

```typescript
// Check if both required names are now filled
const bothFilled = relationMode === 'two'
  ? (partner1Name?.trim() && partner2Name?.trim())
  : relationMode === 'single'
    ? partner1Name?.trim()
    : true;

if (bothFilled) {
  setPartnerNamesSaved(true);
  setShowNamesValidation(false);
}
```

No other files or pages are changed.

