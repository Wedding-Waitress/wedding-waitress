
## Root Cause
1. **Homepage "Get in Touch" form is a FAKE submit** — `handleContactSubmit` in `Landing.tsx` (line 315) just runs a `setTimeout` and shows "Sent". No email is ever sent. This is why support@ never receives anything from the homepage.
2. **Contact page form fails** because the Lovable email infrastructure (`suppressed_emails`, `email_send_log`, `email_unsubscribe_tokens`, pgmq queues, `process-email-queue` cron, `enqueue_email` RPC) was never provisioned in this project. Edge function logs confirm: `Could not find the table 'public.suppressed_emails'`. So `send-transactional-email` aborts at the suppression check and returns 500 → toast shows "Something went wrong".
3. Domain `notify.weddingwaitress.com` IS verified and ready — only the DB infrastructure + dispatcher are missing.

## Plan

### 1. Provision missing email infrastructure
Run `email_domain--setup_email_infra`. This creates (idempotently):
- pgmq extension + `auth_emails` and `transactional_emails` queues
- `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` RPCs
- Tables: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` (with RLS)
- Vault secret `email_queue_service_role_key`
- `process-email-queue` Edge Function + pg_cron job (every 5s)

### 2. Wire homepage "Get in Touch" form to the real backend
File: `src/pages/Landing.tsx` (only the `handleContactSubmit` function, lines 315–325).
- Replace fake `setTimeout` with real `supabase.functions.invoke('send-transactional-email', …)` call using the **same** payload Contact.tsx uses: `templateName: 'contact-form-message'`, `recipientEmail: 'support@weddingwaitress.com'`, `idempotencyKey: contact-${uuid}`, `templateData: { name, email, message, date }`.
- Add zod validation identical to Contact.tsx (name 1–100, email valid 1–255, message 1–2000).
- Show green success `toast.success("Your message has been sent successfully. We will reply within 24 hours.")` and reset form.
- On error: `toast.error("Something went wrong. Please try again or email support@weddingwaitress.com")` + console.error.
- **No JSX/UI/styling changes** — only the handler + add `import { toast } from 'sonner'` if missing.

### 3. Update both forms' toast copy to the exact required strings
- `src/pages/Contact.tsx` — update success/error toast strings to match the new wording. No layout change.
- `src/pages/Landing.tsx` — same wording in new handler.

### 4. Deploy
`supabase--deploy_edge_functions` for `send-transactional-email` and `process-email-queue` so the latest registry + cron dispatcher are live.

### 5. Verify end-to-end (internal test)
- Curl `send-transactional-email` with the contact-form-message template → expect `{ success: true, queued: true }`.
- Wait one cron cycle (~5s), query `email_send_log` → expect status `sent` for the test send to support@weddingwaitress.com.

### 6. Lock
- Stamp 🔒 lock comment header on the modified `Landing.tsx` contact section noting the wiring is locked 2026-04-18 (it is already part of the locked public surface — just refresh the date).
- Append entry in `LOCKED_TRANSLATION_KEYS.md`: "Homepage Get in Touch handler wired to send-transactional-email — locked 2026-04-18". Contact.tsx wiring already locked.

## Files modified
- `src/pages/Landing.tsx` — replace `handleContactSubmit` with real send + zod validation. No JSX changes.
- `src/pages/Contact.tsx` — update toast strings only.
- `LOCKED_TRANSLATION_KEYS.md` — append lock entry.

## Files created
- (Infrastructure tool creates `process-email-queue/` Edge Function, migrations, cron job — managed automatically.)

## Out of scope
- Any UI/layout/styling changes to either form.
- Any change to other pages or features.
- Removing/renaming the existing `contact-form-message` template (it works fine once infra exists).

## Verification
1. `email_send_log` table exists in DB; `process-email-queue` cron job present.
2. Submit homepage "Get in Touch" → green success toast → email arrives at support@weddingwaitress.com within ~10s.
3. Submit `/contact` form → green success toast → email arrives.
4. Trigger an error (e.g. temporarily kill network) → red toast with new wording.
5. Both forms show identical success and error messages, identical validation behaviour.
6. UI of both pages visually unchanged.
