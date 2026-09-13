import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(path:string)=>readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260819113000_account_closure_lifecycle.sql');
const closeAccount=read('supabase/functions/close-account/index.ts');
const purge=read('supabase/functions/purge-closed-accounts/index.ts');
const team=read('src/components/Account/AccountAccessCard.tsx');

describe('recoverable account closure security contract',()=>{
  it('rejects unauthenticated and non-owner deletion and requires recent authentication',()=>{
    expect(closeAccount).toContain("return json({ error: 'Unauthenticated' }, 401)");
    expect(closeAccount).toContain("client.rpc('deactivate_my_account')");
    const retainedClosure=read('supabase/migrations/20260912074042_retained_account_closure_original_entitlement.sql');
    expect(retainedClosure).toContain('Recent authentication is required');
    expect(retainedClosure).toContain("member_user_id=actor AND role='master'");
    expect(retainedClosure).toContain('private.admin_customer_retention_required(actor)');
    expect(closeAccount).not.toContain('subscriptions.cancel');
    expect(closeAccount).not.toContain('STRIPE_SECRET_KEY');
    expect(closeAccount).toContain("operation !== 'ordinary_closure'");
  });
  it('is idempotent, closes entitlements and blocks team and operational access',()=>{
    expect(migration).toContain("IF current_row.status = 'scheduled_for_deletion' THEN RETURN");
    expect(migration).toContain("UPDATE public.user_subscriptions SET status='cancelled',is_read_only=true");
    expect(migration).toContain('UPDATE public.account_members SET access_disabled_at=now()');
    expect(migration).toContain('Operational accounts create and manage events');
  });
  it('allows explicit reactivation only before the deadline without restoring plans or team members',()=>{
    expect(migration).toContain("row.purge_after <= now()");
    expect(migration).toContain("status='reactivated'");
    expect(migration).not.toMatch(/reactivate_my_account[\s\S]*user_subscriptions SET status='active'/);
    expect(migration).toContain("member_user_id=auth.uid() AND role='master'");
  });
  it('selects scheduled purges, uses service-role cleanup and exposes lifecycle only to admins',()=>{
    expect(migration).toContain("status='scheduled_for_deletion' AND purge_after<=now()");
    expect(purge).toContain('Service role required');
    expect(migration).toContain('IF NOT public.is_owner_admin()');
    expect(migration).toContain("cron.schedule('purge-closed-wedding-waitress-accounts'");
  });
  it('restricts administrator-requested purges to the selected eligible account without returning raw backend errors',()=>{
    expect(purge).toContain('candidate.account_owner_id===requestedAccount');
    expect(purge).toContain('selected.length!==1');
    expect(purge).not.toContain('error:error.message');
    expect(purge).not.toContain('error instanceof Error?error.message');
  });
  it('keeps Team & Access free of duplicated plan and event cards',()=>{
    expect(team).not.toContain('Current plan');
    expect(team).not.toContain('Events used');
    expect(team).not.toContain('Additional events');
  });
});
