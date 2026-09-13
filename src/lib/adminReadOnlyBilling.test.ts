import { describe, expect, it, vi } from 'vitest';
import { readAdminBilling } from '../../supabase/functions/_shared/adminReadOnlyBilling';
const customer = { id: 'cus_owned', metadata: { user_id: 'owner' }, livemode: false };
const invoice = { id: 'in_owned', customer: 'cus_owned', livemode: false, created: 1700000000, amount_paid: 19900, currency: 'aud', status: 'paid', invoice_pdf: 'private-url', hosted_invoice_url: 'private-url', customer_email: 'private@example.test' };
const provider = () => ({ customers: { list: vi.fn().mockResolvedValue({ data: [customer], has_more: false }) }, paymentMethods: { list: vi.fn().mockResolvedValue({ data: [{ customer: 'cus_owned', livemode: false, card: { brand: 'visa', last4: '4242', fingerprint: 'private' } }], has_more: false }) }, invoices: { list: vi.fn().mockResolvedValue({ data: [invoice], has_more: false }) } });
describe('readonly owned provider billing projection', () => {
  it('returns masked actual cards and invoice business fields, never portal/private URLs', async () => {
    const result = await readAdminBilling(provider(), 'owner', 'actual@example.test');
    expect(result).toMatchObject({ state: 'available', mode: 'test', history: [{ amountMinor: 19900, currency: 'aud' }], paymentMethods: [{ brand: 'visa', last4: '4242' }] });
    expect(JSON.stringify(result)).not.toMatch(/private|portal|hosted|fingerprint|customer_email/);
  });
  it.each([[], [{ ...customer, metadata: {} }], [customer, { ...customer, id: 'cus_duplicate' }]].map(data => ({ data })))('does not infer ownership from email (%j)', async ({ data }) => {
    const source = provider(); source.customers.list.mockResolvedValue({ data, has_more: false });
    expect(await readAdminBilling(source, 'owner', 'actual@example.test')).toEqual({ state: 'ownership_unavailable' });
    expect(source.invoices.list).not.toHaveBeenCalled();
  });
  it('blocks ambiguous truncated customer lists', async () => {
    const source = provider(); source.customers.list.mockResolvedValue({ data: [customer], has_more: true });
    expect(await readAdminBilling(source, 'owner', 'actual@example.test')).toEqual({ state: 'ownership_unavailable' });
  });
  it.each([{ ...invoice, customer: 'cus_foreign' }, { ...invoice, livemode: true }, { ...invoice, amount_paid: -1 }])('rejects foreign/malformed invoices (%j)', async row => {
    const source = provider(); source.invoices.list.mockResolvedValue({ data: [row], has_more: false });
    await expect(readAdminBilling(source, 'owner', 'actual@example.test')).rejects.toThrow('Invalid owned invoice');
  });
  it('supports explicit bounded next-page history without losing the cursor', async () => {
    const source = provider(); source.invoices.list.mockResolvedValue({ data: [invoice], has_more: true });
    expect(await readAdminBilling(source, 'owner', 'actual@example.test', 'in_previous')).toMatchObject({ nextCursor: 'in_owned' });
    expect(source.invoices.list).toHaveBeenCalledWith({ customer: 'cus_owned', limit: 50, starting_after: 'in_previous' });
  });
});
