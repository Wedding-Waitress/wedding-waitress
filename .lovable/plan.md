
## Move Description Text Inline with "Guest List" Heading

### What Changes

The description text "Manage your event guests, track RSVPs, assign tables, and organize seating arrangements" will move from its own line below the heading to sit on the same line, to the right of "Guest List" with a small gap.

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx` (lines 1367-1372)

**Current structure**:
```
<h1>Guest List</h1>
<p>Manage your event guests...</p>
```

**New structure**:
```
<div class="flex items-baseline gap-3 mb-4">
  <h1>Guest List</h1>
  <p>Manage your event guests...</p>
</div>
```

- Wrap both elements in a flex container with `items-baseline` so text aligns on the same baseline
- Add `gap-3` for spacing between heading and description
- Move `mb-4` from the `<p>` to the wrapper div
- Remove `mb-2` from the `<h1>`
- Keep `hidden sm:block` on the description so it still hides on small screens
