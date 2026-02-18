

## Replace Toggle Label with "Activate / Deactivate" Layout

### What Changes

In the Guest List onboarding Box 3 (Guest Relations), the current toggle row showing the green/red switch and the text "Hide what the guest relation is to you" will be replaced with:

- The toggle centered on its line
- The word **Activate** in bold black text to the left of the toggle
- The word **Deactivate** in bold black text to the right of the toggle
- The "Hide what the guest relation is to you" label is removed entirely

The toggle behavior stays exactly the same: green (left) = relations active, red (right) = relations deactivated.

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Lines 1487-1497** -- Replace the toggle row:

Current:
```tsx
<div className="flex items-center gap-2 mb-3">
  <Switch ... />
  <Label ...>Hide what the guest relation is to you</Label>
</div>
```

Replace with:
```tsx
<div className="flex items-center justify-center gap-3 mb-3">
  <span className="text-sm font-bold text-black">Activate</span>
  <Switch ... />
  <span className="text-sm font-bold text-black">Deactivate</span>
</div>
```

- Remove the `Label` import usage for this specific instance
- Change `flex items-center gap-2` to `flex items-center justify-center gap-3` to center the group
- Keep the Switch component and its props (`id`, `checked`, `onCheckedChange`, `className`) exactly as they are

