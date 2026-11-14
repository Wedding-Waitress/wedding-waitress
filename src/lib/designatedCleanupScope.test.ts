import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
const sql=readFileSync('docs/designated-test-event-cleanup.sql','utf8');
const endpoint=readFileSync('supabase/functions/temporary-test-event-cleanup/index.ts','utf8');
it('uses invoker privileges, genuine service authorization and denies public execution',()=>{
  expect(sql).toContain('SECURITY INVOKER');
  expect(sql).toContain("auth.role() IS DISTINCT FROM 'service_role'");
  expect(sql).toContain('FROM PUBLIC,anon,authenticated');
  expect(sql).not.toMatch(/DISABLE TRIGGER|session_replication_role|request\.jwt/i);
  expect(sql).toContain("set_config('app.designated_test_cleanup_actor',p_actor::text,true)");
  expect(sql).toContain("set_config('app.designated_test_cleanup_actor','',true)");
  expect(sql).toContain("p_actor<>'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'::uuid");
});
it('pins both full identities, locks rows and validates removal count',()=>{
  for(const id of ['9aaa11bf-c6a5-4ebb-adcb-c0e6aa09d862','80acf882-5f0f-4514-9f23-900cfab74116'])expect(sql).toContain(id);
  expect(sql).toContain('FOR UPDATE');
  expect(sql).toContain('actual.user_id IS DISTINCT FROM target.owner');
  expect(sql).toContain('IF removed<>1');
});
it('preserves accounts and audit, rejects unexpected storage and purchases',()=>{
  expect(sql).toContain('INSERT INTO public.admin_action_audit');
  expect(sql).toContain('FROM storage.objects');
  expect(sql).toContain('FROM public.event_purchases');
  expect(sql).not.toMatch(/DELETE FROM (?:auth|storage)\.|DELETE FROM public\.(?:profiles|account_lifecycle)/);
  expect(sql).toContain('DELETE FROM public.dynamic_qr_codes WHERE current_event_id=target.id AND user_id=target.owner');
  expect(sql).toContain("'maintenance','designated-test-cleanup'");
  expect(sql).toContain("'{}'::jsonb,'{}'::jsonb");
});
it('requires current authenticated owner and recent signed admin verification before RPC',()=>{
  for(const guard of ['authenticatePromotionRequest','isOwnerAdminEmail','is_owner_admin','await verifyCleanupGrant(body,user.id,service)'])expect(endpoint).toContain(guard);
  expect(endpoint.indexOf('await verifyCleanupGrant(body,user.id,service)')).toBeLessThan(endpoint.indexOf("db.rpc('temporary_cleanup_designated_test_events'"));
  expect(endpoint).toContain('DELETE ONLY EV-HNBFFYPF AND EV-5F9KDKDU');
});
