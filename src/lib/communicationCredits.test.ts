import { describe, expect, it } from 'vitest';
import { COMMUNICATION_TOPUP, getPlanCommunicationCredits, PLAN_COMMUNICATION_CREDITS } from './communicationCredits';

describe('plan communication credits', () => {
  it('maps the three paid wedding plans to their shared allowances', () => {
    expect(PLAN_COMMUNICATION_CREDITS).toEqual({ essential: 150, premium: 250, unlimited: 450 });
    expect(getPlanCommunicationCredits('Essential')).toBe(150);
    expect(getPlanCommunicationCredits('Premium')).toBe(250);
    expect(getPlanCommunicationCredits('Ultimate')).toBe(450);
    expect(getPlanCommunicationCredits('Unlimited')).toBe(450);
  });

  it('does not grant credits to unknown or inactive plan names', () => {
    expect(getPlanCommunicationCredits('Vendor Pro')).toBe(0);
    expect(getPlanCommunicationCredits('Starter')).toBe(0);
  });

  it('defines the approved top-up', () => {
    expect(COMMUNICATION_TOPUP).toMatchObject({ credits: 100, price_aud: 49 });
  });
});
