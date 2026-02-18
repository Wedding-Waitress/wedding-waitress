

## Compact Add Guest Modal Fields (Re-implementation)

### What changes

All form field heights in the Add Guest modal will be reduced to match the Import/Export CSV button height (h-9, 36px), and vertical spacing between sections will be tightened to bring fields closer together.

### Changes (single file: `src/components/Dashboard/AddGuestModal.tsx`)

**1. Reduce all input/select field heights**

Every `Input` and `SelectTrigger` in the modal currently uses `h-11 sm:h-10`. These will all change to `h-9`. Affected fields:
- First Name, Last Name (lines 1014, 1032)
- Mobile, Email (lines 1053, 1071)
- Table SelectTrigger (line 1097)
- Seat Number SelectTrigger (line 1129)
- RSVP Status SelectTrigger (line 1222)
- Dietary Requirements SelectTrigger (line 1248)

**2. Reduce the guest type selector height**

The Individual/Couple/Family tab buttons currently use `py-2 px-6` (lines 962, 979, 991). These will change to `py-1.5 px-6` for a slightly shorter pill.

**3. Tighten vertical spacing**

| Location | Line | Before | After |
|---|---|---|---|
| Outer scroll container | 947 | `space-y-4 sm:space-y-6` | `space-y-3 sm:space-y-4` |
| Form element | 949 | `space-y-6` | `space-y-3` |
| Guest type container | 953 | `pt-2 pb-4` | `pt-1 pb-2` |
| Grid gaps (4 locations) | 1004, 1043, 1082, 1210 | `gap-4` | `gap-3` |

### Summary

| Property | Before | After |
|---|---|---|
| Field height | `h-11 sm:h-10` (40-44px) | `h-9` (36px) |
| Tab button padding | `py-2` | `py-1.5` |
| Form section gap | 24px (`space-y-6`) | 12px (`space-y-3`) |
| Grid gap | 16px (`gap-4`) | 12px (`gap-3`) |

No logic, validation, or security changes -- purely visual compaction.

