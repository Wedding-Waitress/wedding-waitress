export type RefundAccessChoice = 'keep' | 'suspend';
export function refundAmountMinor(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a valid AUD amount with at most two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('Enter a positive refund amount.');
  return minor;
}
export function validateRefundSelection(amount: number, remaining: number, choice: unknown, reason: string, customerReason: string) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) throw new Error('Refund exceeds the remaining refundable amount.');
  if (choice !== 'keep' && choice !== 'suspend') throw new Error('Choose what happens to account access.');
  if (reason.trim().length < 5 || reason.trim().length > 1000) throw new Error('Provide an administrator reason of 5–1,000 characters.');
  if (choice === 'suspend' && (customerReason.trim().length < 5 || customerReason.trim().length > 2000)) throw new Error('Provide a customer-visible suspension reason.');
}
