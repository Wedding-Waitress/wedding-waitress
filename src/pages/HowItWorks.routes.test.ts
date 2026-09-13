import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/pages/HowItWorks.tsx', 'utf8');

describe('How It Works public workflow links', () => {
  it('routes Event Budget Planner visitors to its public product page', () => {
    expect(source).toContain("dashboard: '/event-budget-planner'");
    expect(source).not.toContain("dashboard: '/dashboard?tab=dashboard'");
  });
});
