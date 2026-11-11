import React from 'react';
import type { TopupEligibility } from '@/lib/communicationTopupEligibility';
export function CommunicationTopupNotice({ eligibility, retry }: { eligibility: TopupEligibility; retry: () => unknown }) {
  if (eligibility.status === 'eligible') return null;
  return <div className="mt-2 text-xs text-muted-foreground" role="status">
    <p>{eligibility.message}</p>
    {eligibility.status === 'error' && <button type="button" className="underline mt-1" onClick={() => { void retry(); }}>Retry eligibility check</button>}
    {eligibility.status === 'ineligible' && <a className="underline mt-1 inline-block" href="/dashboard?tab=account">Review account and plan</a>}
  </div>;
}
