

# Add FORCE ROW LEVEL SECURITY to Two Tables

## Overview
Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to `notification_settings` and `guest_access_tokens`. This ensures RLS policies are enforced even for table owners (superusers), adding an extra layer of protection.

## Changes

### 1. Database migration
Run a single SQL migration:

```sql
ALTER TABLE public.notification_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_access_tokens FORCE ROW LEVEL SECURITY;
```

No code changes are needed -- this is a database-only hardening step. Existing RLS policies remain unchanged and will continue to work as before.

