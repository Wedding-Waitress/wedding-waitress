

## Align Canvas Top with Page Heading

**File**: `src/components/Dashboard/Invitations/InvitationsPage.tsx` (line 415)

**Change**: Remove the top padding entirely from the preview column. Change `pt-16` to `pt-0` so the canvas aligns with the top of the heading on the left.

```
// Before
<div className="lg:col-span-3 pt-16">

// After
<div className="lg:col-span-3 pt-0">
```

Single line change.

