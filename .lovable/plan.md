
# Remove "Family Group" from Add New Guest Form

## What Changes

The "Family Group" input field will be hidden when adding a new guest (Individual, Couple, or Family). It will remain visible in the Edit Guest popup, so hosts can manage family grouping after the initial creation.

## Why This Makes Sense

- When adding a Couple or Family, the system already auto-generates the family group name (e.g. "Smith & Jones" or "Smith Family")
- For Individual guests, a family group at creation time is rarely needed
- Keeping it in Edit Guest gives full control later without cluttering the initial form

## Technical Detail

**File: `src/components/Dashboard/AddGuestModal.tsx`** (lines 1433-1454)

Wrap the Family Group field block with an `isEdit` condition so it only renders during editing:

```
// Before (always shown)
{/* Family Group */}
<FormField ... name="family_group" ... />

// After (edit mode only)
{isEdit && (
  {/* Family Group */}
  <FormField ... name="family_group" ... />
)}
```

Single condition added around an existing block -- no other files or logic affected. The auto-generation of family group names for couples/families continues to work as before.
