import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260909205000_transactional_email_delivery_queue.sql', 'utf8')
const rollback = readFileSync('supabase/rollbacks/20260909205000_transactional_email_delivery_queue.rollback.sql', 'utf8')
const sender = readFileSync('supabase/functions/send-transactional-email/index.ts', 'utf8')
const processor = readFileSync('supabase/functions/process-transactional-email-queue/index.ts', 'utf8')

describe('transactional email queue release', () => {
  it('creates every missing sender dependency and a durable queue', () => {
    for (const name of ['suppressed_emails', 'email_unsubscribe_tokens', 'email_send_log', 'transactional_email_queue']) {
      expect(migration).toContain(`public.${name}`)
    }
    expect(migration).toContain('public.enqueue_email')
    expect(migration).toContain('public.claim_transactional_email')
    expect(migration).toContain('public.complete_transactional_email')
    expect(migration).toContain('unique (queue_name, idempotency_key)')
  })

  it('keeps queue data and RPCs service-role-only', () => {
    expect(migration).toMatch(/revoke all on public\.transactional_email_queue from anon, authenticated/i)
    expect(migration).toMatch(/revoke all on function public\.enqueue_email\(text, jsonb\) from public, anon, authenticated/i)
    expect(migration).toMatch(/grant execute on function public\.enqueue_email\(text, jsonb\) to service_role/i)
    expect(migration).not.toMatch(/grant execute[^;]+to (anon|authenticated)/i)
  })

  it('requires a JWT and an independent processor secret before provider delivery', () => {
    expect(processor).toContain("x-transactional-email-processor-secret")
    expect(processor).toContain("TRANSACTIONAL_EMAIL_PROCESSOR_SECRET")
    expect(processor).toContain("https://api.resend.com/emails")
    expect(sender).toContain("process-transactional-email-queue")
    expect(sender).toContain("deliveryResult?.success !== true")
  })

  it('provides a data-preserving rollback', () => {
    expect(rollback).toContain("set status = 'failed'")
    expect(rollback).toContain('drop function if exists public.enqueue_email')
    expect(rollback).not.toMatch(/drop table/i)
  })
})
