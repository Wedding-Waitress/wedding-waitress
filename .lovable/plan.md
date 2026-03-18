

## Plan: Add informational note below "Add QR Code to Invite" heading

### Change

**File: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`**

Insert a styled note between line 603 (after the heading closing `</h3>`) and line 605 (before the "Choose Event" section). The note will be wrapped in a soft purple-bordered container:

```tsx
<div className="border border-primary/30 rounded-lg p-3 bg-primary/5">
  <p className="text-sm text-muted-foreground">
    Adding a QR code to your invitation is only necessary and recommended when you are physically printing your invites and sending them in the mail.
  </p>
</div>
```

This sits between the heading and the "Choose Event" dropdown, inherits the `space-y-4` gap from the parent, and uses a subtle purple border with light purple background consistent with the panel styling.

### Files changed: 1

