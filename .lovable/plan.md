

## Move Invitation Preview Up

**File**: `src/components/Dashboard/Invitations/InvitationsPage.tsx` (line 415)

**Change**: Reduce the top padding on the preview column from `pt-24` (6rem / ~96px) to `pt-16` (4rem / ~64px), shifting the invitation canvas up by approximately two text lines.

```
// Before
<div className="lg:col-span-3 pt-24">

// After
<div className="lg:col-span-3 pt-16">
```

Single line change, no other files affected.

