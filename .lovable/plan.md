

# Fix: Admin Template Upload RLS Error

## Problem
Two issues prevent template creation from the Admin panel:

1. **Missing admin role**: The logged-in user has no record in `user_roles`, so the RLS policy `has_role(auth.uid(), 'admin')` on `invitation_templates` returns false, blocking the INSERT.
2. **Storage path mismatch**: The `invitations` bucket policy requires uploads in a folder named `{auth.uid()}/...`, but the code uploads to `templates/...`.

## Solution

### 1. Add Admin Role for the User
Insert the current user's admin role into the `user_roles` table. This is a data operation (not a schema change).

### 2. Fix Storage Upload Path in AdminInvitationTemplates.tsx
Change the upload path from `templates/${timestamp}-${random}.${ext}` to `${auth.uid()}/templates/${timestamp}-${random}.${ext}` so it matches the existing storage RLS policy.

**File**: `src/components/Admin/AdminInvitationTemplates.tsx`
- Update the `uploadFile` function to include the user's ID as the first folder in the path
- Get user ID from `supabase.auth.getUser()` before uploading

## Technical Details

### Storage path change (AdminInvitationTemplates.tsx)
```typescript
const uploadFile = async (file: File): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ext = file.name.split('.').pop();
  const path = `${user.id}/templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  // ... rest unchanged
};
```

### Admin role insertion
Run a data query to add the admin role for the logged-in user. This requires knowing the user's UUID -- we will retrieve it from the current session and insert into `user_roles`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/Admin/AdminInvitationTemplates.tsx` | Fix upload path to include user ID folder |
| Database (data insert) | Add admin role for the current user in `user_roles` |

