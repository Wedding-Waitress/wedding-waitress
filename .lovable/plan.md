
## Reduce Green Circle Badges to Half Size

The three green onboarding step badges ("1st", "2nd", "3rd") in the Guest List page will be reduced to half their current size.

### What Changes

Three lines in `src/components/Dashboard/GuestListTable.tsx`:

- **Line 1378** (1st badge): `w-16 h-16 text-2xl` changes to `w-8 h-8 text-xs`
- **Line 1421** (2nd badge): `w-16 h-16 text-2xl` changes to `w-8 h-8 text-xs`
- **Line 1465** (3rd badge): `w-16 h-16 text-2xl` changes to `w-8 h-8 text-xs`

### Technical Details

All three badges share the same class pattern. The size classes change from:
- Width/height: `w-16 h-16` (64px) to `w-8 h-8` (32px)
- Font size: `text-2xl` (24px) to `text-xs` (12px)

No other elements or styles are affected.
