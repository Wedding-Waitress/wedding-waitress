import { describe, expect, it } from 'vitest';
import { formatEventAllowanceLabel } from './eventAllowanceLabel';

describe('formatEventAllowanceLabel', () => {
  it.each([
    [{ created: 0, allowance: 1 }, 'Events: 0 of 1 created'],
    [{ created: 1, allowance: 1 }, 'Events: 1 of 1 created'],
    [{ created: 2, allowance: 3 }, 'Events: 2 of 3 created'],
    [{ created: 3, allowance: null }, 'Events: 3 created \u00b7 Unlimited'],
    [{ created: 3, allowance: Number.POSITIVE_INFINITY }, 'Events: 3 created \u00b7 Unlimited'],
  ] as const)('formats $1 as %s', (input, expected) => {
    expect(formatEventAllowanceLabel(input)).toBe(expected);
  });
});
