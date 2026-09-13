import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const migration=readFileSync('supabase/migrations/20260912054344_admin_logical_deletion_retention.sql','utf8');
const rollback=readFileSync('supabase/rollbacks/20260912054344_admin_logical_deletion_retention.rollback.sql','utf8');
const action=readFileSync('supabase/functions/admin-account-action/index.ts','utf8');
const purge=readFileSync('supabase/functions/purge-closed-accounts/index.ts','utf8');
it('combines suspension and logical-deletion status changes with session revocation transactionally',()=>{
 expect(migration).toMatch(/result:=private\.admin_suspend_account[\s\S]*?private\.revoke_admin_blocked_sessions/);
 expect(migration).toMatch(/UPDATE public\.account_lifecycle SET admin_deleted_at[\s\S]*?private\.revoke_admin_blocked_sessions/);
 expect(migration).toContain("'sessions_revoked',false");
 expect(action).toContain('success:false,state_changed:true');
 expect(action).toContain("admin_logically_delete_account");
 expect(action).toContain("admin_restore_deleted_account");
});
it('retains audited administrator deletions but keeps customer closure distinct',()=>{
 expect(migration).toContain("l.audit_metadata->>'source'='verified_admin'");
 expect(migration).toContain("a.action='close_account'");
 expect(migration).toContain("NEW.purge_after:='infinity'");
 expect(migration).toMatch(/AND admin_deleted_at IS NULL AND NOT private\.admin_customer_retention_required\(account_owner_id\)\s+AND purge_after<=now\(\)/);
});
it('freshly checks retention before storage deletion and keeps state-based access restrictions',()=>{
 expect(purge.indexOf('current.admin_deleted_at')).toBeLessThan(purge.indexOf('admin.storage.from(bucket).remove'));
 expect(migration).toContain('Admin deletion blocks planning access');
 expect(migration).toContain("'Suspension blocks storage access'");
 expect(migration).toContain("'admin_deleted'");
});
it('rollback withdraws new controls without erasing records or releasing retention holds',()=>{
 expect(rollback).toContain('KEEP admin_deleted_at');
 expect(rollback).not.toMatch(/DELETE FROM|DROP COLUMN|DROP TABLE|DROP TRIGGER/);
 expect(rollback).toContain('FROM PUBLIC,anon,authenticated,service_role');
});
