
# Admin UI for Vendor Pro Approval Toggle

## Why This First?
The checkout and verify-payment edge functions are already deployed and their logs are viewable anytime via the Supabase dashboard. The Vendor Pro approval toggle is the critical missing piece -- without it, vendors who pay are stuck in `pending_approval` forever with no way for you to activate them.

## What We'll Build

### 1. New Admin Tab: "Subscriptions"
Add a new tab to the Admin Dashboard (`/admin`) between "Events" and "Settings" called **"Subscriptions"**.

### 2. AdminSubscriptions Component
A new component `src/components/Admin/AdminSubscriptions.tsx` that shows:

- **Summary cards** at top:
  - Total Active Subscriptions
  - Pending Vendor Approvals (highlighted in amber/orange)
  - Expired Subscriptions

- **Pending Vendor Approvals section** (shown prominently if any exist):
  - Table with columns: User Name, Email, Plan, Payment Date, Status, Actions
  - Each row has an **"Approve"** button (green) and a **"Reject"** button (red)
  - Approve: updates `user_subscriptions` to `status = 'active'` and `is_read_only = false`
  - Reject: updates `user_subscriptions` to `status = 'rejected'` and keeps `is_read_only = true`
  - Toast confirmation after each action

- **All Subscriptions table** below:
  - Searchable/filterable list of all `user_subscriptions` joined with `profiles` and `subscription_plans`
  - Shows: User, Plan Name, Status (color-coded badge), Started, Expires, Read-Only flag
  - Status badges: green for active, amber for pending_approval, red for expired/rejected, gray for cancelled

### 3. Edge Function: `admin-manage-subscription`
A new edge function at `supabase/functions/admin-manage-subscription/index.ts` that:
- Accepts `{ subscription_id, action: 'approve' | 'reject' }` 
- Validates the caller is an admin (checks `user_roles` table for admin role)
- Uses service role key to update `user_subscriptions`
- On approve: sets `status = 'active'`, `is_read_only = false`
- On reject: sets `status = 'rejected'`, keeps `is_read_only = true`
- Returns success/error response

This is needed because the admin can't directly update other users' subscriptions via RLS -- we need a server-side function with service role access.

### 4. Files to Create/Edit

| File | Action | Purpose |
|------|--------|---------|
| `src/components/Admin/AdminSubscriptions.tsx` | Create | New subscription management UI |
| `supabase/functions/admin-manage-subscription/index.ts` | Create | Server-side approval/rejection |
| `src/pages/Admin.tsx` | Edit | Add "Subscriptions" tab |
| `supabase/config.toml` | Edit | Register new edge function |

### 5. Technical Details

**AdminSubscriptions.tsx** will:
- Query `user_subscriptions` joined with `profiles` (for name/email) and `subscription_plans` (for plan name)
- Filter pending approvals into a highlighted section
- Call `supabase.functions.invoke('admin-manage-subscription', ...)` for approve/reject actions
- Auto-refresh list after each action

**admin-manage-subscription edge function** will:
- Use `verify_jwt = false` in config.toml with manual JWT verification
- Check admin role via `user_roles` table using service role client
- Update the target subscription record
- Return the updated status

**Admin.tsx** changes:
- Import `AdminSubscriptions`
- Add 7th tab "Subscriptions" with a badge showing pending count
- Grid cols updated from 6 to 7

### 6. Design
- Matches existing admin panel style (purple headings, `ww-box` cards, shadcn components)
- Pending approvals highlighted with amber/warning border
- Status badges use color-coded pills (green/amber/red/gray)
- Responsive table layout consistent with AdminUsers
