
## Goal
Provision the missing email infrastructure so both contact forms (homepage "Get in Touch" and `/contact`) actually deliver to support@weddingwaitress.com. No UI changes.

## Findings
- Edge function logs confirm: `Could not find the table 'public.suppressed_emails' in the schema cache` → infra never provisioned.
- Domain `notify.weddingwaitress.com` is already verified and wired into `send-transactional-email` (`SENDER_DOMAIN`, `FROM_DOMAIN` correct).
- `send-transactional-email/index.ts` already has full error handling, suppression check, token mgmt, queue enqueue, and `email_send_log` writes — code is fine; only the DB objects are missing.
- Both forms (`Landing.tsx`, `Contact.tsx`) are already wired to `supabase.functions.invoke('send-transactional-email', ...)` with template `contact-form-message`.
- Per Lovable rules: **never hand-write the email infra SQL**. The managed setup tool creates pgmq queues, all 4 tables (`suppressed_emails`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`) with RLS, the `enqueue_email` / `read_email_batch` / `delete_email` / `move_to_dlq` RPCs (SECURITY DEFINER), the `process-email-queue` Edge Function, the vault secret, and the pg_cron job (every 5s).
- Resend is NOT used. Lovable's built-in email infrastructure handles delivery via the verified domain — no `RESEND_API_KEY` needed. (The user's request mentions Resend, but Lovable Emails is already configured and verified; switching to Resend would break the existing NS delegation. I'll note this clearly.)

## Plan

### 1. Provision email infrastructure (managed tool)
Run the Lovable managed setup that idempotently creates:
- pgmq extension + `auth_emails` and `transactional_emails` queues
- Tables: `suppressed_emails`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens` (with RLS)
- RPCs: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` (all SECURITY DEFINER)
- Vault secret: `email_queue_service_role_key`
- Edge Function: `process-email-queue` (queue dispatcher)
- pg_cron job running every 5s to drain the queue

### 2. Redeploy Edge Functions
Redeploy `send-transactional-email` and `process-email-queue` so they pick up the new schema.

### 3. Internal end-to-end verification
- Curl `send-transactional-email` with `templateName: 'contact-form-message'` → expect `{ success: true, queued: true }`.
- Wait one cron cycle, then `SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 5` → expect a row with `status = 'sent'` for support@weddingwaitress.com.
- Check `process-email-queue` logs → no errors.

### 4. Lock
- Append a 2026-04-18 entry to `LOCKED_TRANSLATION_KEYS.md` covering the infra + both contact-form wirings.
- Refresh 🔒 lock comment on `send-transactional-email/index.ts` (no code change — the file is already correct).

## Files modified
- `LOCKED_TRANSLATION_KEYS.md` — append lock entry.
- `supabase/functions/send-transactional-email/index.ts` — refresh lock-date comment only (no logic change).

## Files created (by managed tool, not hand-written)
- pgmq queues, 4 email tables, 4 RPCs, vault secret, cron job, `process-email-queue/` Edge Function.

## About Resend
Lovable's built-in email service is already active on the verified domain `notify.weddingwaitress.com`. Switching to Resend would require removing the existing NS delegation at the registrar and re-verifying — and would lose the unified queue/suppression/unsubscribe pipeline. I'll proceed with Lovable Emails (recommended). If you specifically want Resend instead, say the word and I'll lay out the migration plan separately.

## Out of scope
- Any UI/layout/styling change (forms remain identical).
- Any change to other pages, templates, or features.
- Resend integration (unless explicitly requested).

## Verification checklist
1. `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_state` tables exist.
2. `enqueue_email` RPC exists with SECURITY DEFINER.
3. pg_cron job `process-email-queue` is scheduled and active.
4. Test invoke of `send-transactional-email` returns `{ success: true, queued: true }`.
5. Within ~10s, `email_send_log` shows status `sent` for the test send.
6. Real email arrives at support@weddingwaitress.com from both homepage and `/contact` forms.
7. UI of both pages visually unchanged.
