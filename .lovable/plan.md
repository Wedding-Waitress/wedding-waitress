

## Compact Add Guest Modal Fields

### What changes

All form field heights in the Add Guest modal will be reduced to match the Import/Export CSV button height (`h-9`, 36px), and vertical spacing between sections will be tightened.

### Changes (single file: `src/components/Dashboard/AddGuestModal.tsx`)

**1. Reduce all input/select field heights**

Every `Input` and `SelectTrigger` in the modal currently uses `h-11 sm:h-10`. These will all change to `h-9` to match the CSV button height. Affected fields:
- First Name, Last Name (lines 1014, 1032)
- Mobile, Email (lines 1053, 1071)
- Table, Seat Number (lines 1097, 1129)
- RSVP Status, Dietary Requirements (lines 1222, 1248)

**2. Reduce the guest type selector height**

The Individual/Couple/Family tab buttons use `py-2 px-6`. These will change to `py-1.5 px-6` for a slightly shorter pill, and the bottom padding of the container changes from `pb-4` to `pb-2`.

**3. Tighten vertical spacing**

| Location | Before | After |
|---|---|---|
| Form sections (`form` class) | `space-y-6` | `space-y-3` |
| Grid gaps | `gap-4` | `gap-3` |
| Outer scroll container | `space-y-4 sm:space-y-6` | `space-y-3 sm:space-y-4` |
| Guest type container padding | `pt-2 pb-4` | `pt-1 pb-2` |

### Summary

| Property | Before | After |
|---|---|---|
| Field height (desktop) | 40px (`h-10`) | 36px (`h-9`) |
| Field height (mobile) | 44px (`h-11`) | 36px (`h-9`) |
| Tab button padding | `py-2` | `py-1.5` |
| Form section gap | 24px | 12px |
| Grid gap | 16px | 12px |

No logic, validation, or security changes -- purely visual compaction.
