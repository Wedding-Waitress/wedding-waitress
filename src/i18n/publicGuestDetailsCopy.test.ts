import { expect, it } from 'vitest';
import { publicGuestDetailsRows, publicGuestDetailsSources } from './publicGuestDetailsCopy';
import { publicRsvpImmediateSaveCopy } from './publicRsvpImmediateSaveCopy';
it('provides the guest details actions and warning in every header language', () => {
  expect(Object.keys(publicGuestDetailsRows)).toEqual(Object.keys(publicRsvpImmediateSaveCopy));
  for (const row of Object.values(publicGuestDetailsRows)) {
    expect(row).toHaveLength(publicGuestDetailsSources.length);
    for (const text of row) expect(text.trim()).not.toBe('');
  }
});
