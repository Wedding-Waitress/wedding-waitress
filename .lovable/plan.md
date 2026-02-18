

## Fix: Family Groups With 2 Members Incorrectly Shown as Couples

### The Problem

When you select "Family" in the group type dialog, the system correctly names the group (e.g., "Sallistonton Family"), but the guest list table ignores the name and decides couple vs family based solely on member count. Any group with exactly 2 members is displayed as a "Couple" with an orange header, regardless of the user's choice.

### Root Cause

Two places in `GuestListTable.tsx` determine group type by member count only:

1. **Line 728** (group rendering): `const type = members.length === 2 ? 'couple' : 'family'`
2. **Lines 1340-1347** (stats badges): `if (members.length === 2) stats.couple++`

### The Fix

**File: `src/components/Dashboard/GuestListTable.tsx`**

Instead of using member count, infer the group type from the `family_group` name that was set during the user's selection:

- Names ending with "Family" (e.g., "Sallistonton Family") are treated as **Family** groups (blue header)
- Names containing "&" or ending with "Couple" (e.g., "Smith & Benjamin") are treated as **Couple** groups (orange header)
- Fallback: if name doesn't match either pattern, use the current member-count logic

This applies to both locations:

1. **Line 728** -- Update the grouping logic to check the group name pattern first
2. **Lines 1340-1347** -- Update the stats counting to use the same name-based logic

A small helper function will be added to determine the type from the group name:

```
const inferGroupType = (groupName: string, memberCount: number) => {
  if (groupName.endsWith(' Family')) return 'family';
  if (groupName.includes(' & ') || groupName.endsWith(' Couple')) return 'couple';
  return memberCount >= 3 ? 'family' : 'couple';
};
```

No other files need to change. The naming in `AddGuestModal.tsx` already correctly uses "Family" suffix for family groups and "&" for couples.
