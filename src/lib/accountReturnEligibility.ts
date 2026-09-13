/** Presentation of a server decision only; never a client authorization grant. */
export interface AccountReturnEligibility {
  account_closed: boolean;
  admin_blocked: boolean;
  paid_until: string | null;
  entitlement_kind?: 'paid' | 'trial';
  entitlement_until?: string | null;
  server_now: string;
  can_reopen: boolean;
  renewal_required: boolean;
}

export function validateAccountReturnEligibility(value: unknown): AccountReturnEligibility | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (['account_closed', 'admin_blocked', 'can_reopen', 'renewal_required'].some(key => typeof row[key] !== 'boolean')) return null;
  if (typeof row.server_now !== 'string' || !Number.isFinite(Date.parse(row.server_now))) return null;
  if (row.paid_until !== null && (typeof row.paid_until !== 'string' || !Number.isFinite(Date.parse(row.paid_until)))) return null;
  if (row.entitlement_kind !== undefined && row.entitlement_kind !== 'paid' && row.entitlement_kind !== 'trial') return null;
  if (row.entitlement_kind !== undefined && row.entitlement_until !== null && (typeof row.entitlement_until !== 'string' || !Number.isFinite(Date.parse(row.entitlement_until)))) return null;
  if (row.entitlement_kind === 'paid' && row.entitlement_until !== row.paid_until) return null;
  if (row.entitlement_kind === 'trial' && row.paid_until !== null) return null;
  const deadline = row.entitlement_kind === undefined ? row.paid_until : row.entitlement_until;
  const termValid = typeof deadline === 'string' && Date.parse(deadline) > Date.parse(row.server_now);
  if (row.can_reopen && (!row.account_closed || row.admin_blocked || !termValid || row.renewal_required)) return null;
  if (row.renewal_required && (!row.account_closed || row.admin_blocked || termValid || row.can_reopen)) return null;
  return row as unknown as AccountReturnEligibility;
}
