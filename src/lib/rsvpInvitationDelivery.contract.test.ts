import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sms = readFileSync('supabase/functions/send-rsvp-sms/index.ts', 'utf8');
const email = readFileSync('supabase/functions/send-rsvp-email/index.ts', 'utf8');
const service = readFileSync('supabase/functions/_shared/sms-service.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260918194500_fix_rsvp_invitation_delivery.sql', 'utf8');
const actionStyles = readFileSync('src/components/Dashboard/RsvpInviteActions.module.css', 'utf8');

describe('RSVP invitation delivery contract', () => {
  it('uses the authoritative Platform Owner shared-credit allowance', () => {
    expect(migration).toContain('private.is_platform_owner(_user_id)');
    expect(migration).toContain('_allowance := 450');
  });

  it('normalizes Australian SMS recipients to E.164 before provider delivery', () => {
    expect(sms).toContain("`+61${compact.slice(1)}`");
    expect(sms).toContain("/^\\+[1-9]\\d{7,14}$/");
  });

  it('reserves and restores SMS credit around provider acceptance', () => {
    expect(service).toContain('consume_communication_credit');
    expect(service).toContain('restore_communication_credit');
    expect(service.indexOf('consume_communication_credit')).toBeLessThan(service.indexOf('await fetch(url'));
    expect(service.indexOf('restore_communication_credit')).toBeGreaterThan(service.indexOf('await fetch(url'));
  });

  it('reserves and restores email credit around provider acceptance', () => {
    expect(email.indexOf('consume_communication_credit')).toBeLessThan(email.indexOf("await fetch('https://api.resend.com/emails'"));
    expect(email.indexOf('restore_communication_credit')).toBeGreaterThan(email.indexOf("await fetch('https://api.resend.com/emails'"));
  });

  it('prevents duplicate provider calls with stable request identifiers', () => {
    expect(migration).toContain('sms_send_logs_delivery_id_key');
    expect(service).toContain("error?.code === '23505'");
    expect(email).toContain('stableEmailMessageId(`${request_id}:${guest.id}:email`)');
    expect(email).toContain('if (!claimed) { skipped++; continue; }');
  });

  it('returns precise configuration errors without generic internal-server wording', () => {
    expect(sms).toContain("code: 'SMS_NOT_CONFIGURED'");
    expect(email).toContain("code: 'EMAIL_NOT_CONFIGURED'");
    expect(sms).not.toContain("JSON.stringify({ error: 'Internal server error' })");
    expect(email).not.toContain("JSON.stringify({ error: 'Internal server error' })");
  });

  it('uses the approved green and red RSVP modal actions with cascade-safe backgrounds', () => {
    expect(actionStyles).toMatch(/\.primaryAction\.primaryAction[\s\S]*linear-gradient\(180deg, #7bd880, #55a447\) !important/);
    expect(actionStyles).toMatch(/\.cancelAction\.cancelAction[\s\S]*linear-gradient\(180deg, #f85b53, #d9342c\) !important/);
  });
});
