import { describe, expect, it } from 'vitest';
import { stableEmailMessageId, supportRateKey } from '../../supabase/functions/_shared/customer-email-data';
describe('private durable linkage keys', () => {
  it('uses stable distinct message identifiers without storing message bodies', async () => {
    const first = await stableEmailMessageId('alice:welcome:unique-key');
    expect(first).toMatch(/^[a-f0-9]{64}$/); expect(first).toBe(await stableEmailMessageId('alice:welcome:unique-key'));
    expect(first).not.toBe(await stableEmailMessageId('bob:welcome:unique-key'));
  });
  it('rate keys are keyed hashes, not exposed customer/IP identifiers', async () => {
    const key = await supportRateKey('test-only-secret', '127.0.0.1');
    expect(key).toMatch(/^[a-f0-9]{64}$/); expect(key).not.toContain('127.0.0.1');
    expect(key).not.toBe(await supportRateKey('different-test-secret', '127.0.0.1'));
  });
});
