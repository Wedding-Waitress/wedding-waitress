

## Plan: Add "Update & Confirm Your Details" text above search input

### Change (in `src/pages/GuestLookup.tsx`)

Add a heading text "Update & Confirm Your Details" inside the purple-bordered card, above the green-bordered search input. Insert it between line 685 (`CardContent`) and line 686 (`Search Input` comment).

```tsx
<CardContent className="space-y-4 pt-6">
  <p className="text-center text-sm font-semibold text-primary">Update & Confirm Your Details</p>
  {/* Search Input */}
```

Single line addition, no other changes.

