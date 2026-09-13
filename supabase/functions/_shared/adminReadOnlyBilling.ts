/** Restricted to provider GET/list capabilities; no customer portal or payment actions. */
export interface ReadOnlyBillingProvider {
  customers: { list(input: { email: string; limit: number }): Promise<{ data: any[]; has_more: boolean }> };
  paymentMethods: { list(input: { customer: string; type: 'card'; limit: number }): Promise<{ data: any[]; has_more: boolean }> };
  invoices: { list(input: { customer: string; limit: number; starting_after?: string }): Promise<{ data: any[]; has_more: boolean }> };
}
const id = (value: unknown, prefix: string): value is string => typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value);
const customerId = (value: any) => typeof value === 'string' ? value : value?.id;

export async function readAdminBilling(provider: ReadOnlyBillingProvider, ownerId: string, email: string, cursor?: string) {
  if (cursor && !id(cursor, 'in')) throw new Error('Invalid invoice cursor');
  const customers = await provider.customers.list({ email, limit: 100 });
  // Email alone is never account ownership evidence. An incomplete candidate set is ambiguous.
  if (customers.has_more) return { state: 'ownership_unavailable' as const };
  const owned = customers.data.filter(customer => !customer.deleted && customer.metadata?.user_id === ownerId && id(customer.id, 'cus'));
  if (owned.length !== 1) return { state: 'ownership_unavailable' as const };
  const customer = owned[0];
  if (typeof customer.livemode !== 'boolean') throw new Error('Invalid provider mode');
  const [cards, invoices] = await Promise.all([
    provider.paymentMethods.list({ customer: customer.id, type: 'card', limit: 100 }),
    provider.invoices.list({ customer: customer.id, limit: 50, ...(cursor ? { starting_after: cursor } : {}) }),
  ]);
  const paymentMethods = cards.data.map(method => {
    if (customerId(method.customer) !== customer.id || method.livemode !== customer.livemode || typeof method.card?.brand !== 'string' || !/^\d{4}$/.test(method.card?.last4)) throw new Error('Invalid owned payment method');
    return { brand: method.card.brand, last4: method.card.last4 };
  });
  const history = invoices.data.map(invoice => {
    if (!id(invoice.id, 'in') || customerId(invoice.customer) !== customer.id || invoice.livemode !== customer.livemode
      || !Number.isSafeInteger(invoice.created) || !Number.isFinite(new Date(invoice.created * 1000).getTime())
      || !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid < 0 || !/^[a-z]{3}$/.test(invoice.currency)
      || !['draft', 'open', 'paid', 'uncollectible', 'void'].includes(invoice.status)) throw new Error('Invalid owned invoice');
    return { id: invoice.id, date: new Date(invoice.created * 1000).toISOString(), amountMinor: invoice.amount_paid, currency: invoice.currency, status: invoice.status };
  });
  if (invoices.has_more && !history.length) throw new Error('Invalid invoice pagination');
  return { state: 'available' as const, read_only: true, ownerId, mode: customer.livemode ? 'live' : 'test', paymentMethods,
    paymentMethodsTruncated: cards.has_more, history, nextCursor: invoices.has_more ? history[history.length - 1].id : null };
}
