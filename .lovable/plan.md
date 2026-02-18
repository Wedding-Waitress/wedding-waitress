
## Red Error Highlight on Seat Number When Unavailable

### What this does

When a seat conflict occurs (the "Seat Unavailable" toast), the Seat Number field will also turn red -- both the label text and the field border -- matching the existing behavior of the Relation field. The red styling clears as soon as the user selects a new seat.

### Changes (single file: `src/components/Dashboard/AddGuestModal.tsx`)

**1. Set form error on seat conflict (2 locations)**

At both conflict handlers (lines ~670-677 for edit, ~739-746 for create), after showing the toast, also call:
```
form.setError('seat_no', { type: 'manual', message: 'Seat unavailable. Please choose another.' });
```

**2. Add red border styling to the SelectTrigger when there's an error**

The Seat Number `SelectTrigger` (line 1129) currently always uses `border-primary` (purple). We'll make it conditional: if there's a `seat_no` error on the form, use `border-destructive` (red) instead.

The `FormLabel` already turns red automatically via the existing `FormMessage` / `FormLabel` components from shadcn (they read the form error state), and the `FormMessage` below the field will display the error text.

**3. Clear the error when user selects a new seat**

In the `onValueChange` handler (line 1124), after setting the value, also call `form.clearErrors('seat_no')` so the red clears immediately upon selection.

### Summary

| What | Before | After |
|---|---|---|
| Seat conflict toast | Shows red toast only | Shows red toast AND marks field red |
| Seat Number label | Always default color | Turns red on conflict (via FormLabel) |
| Seat Number border | Always purple | Turns red on conflict, back to purple on new selection |
| Error message below field | None | "Seat unavailable. Please choose another." |
