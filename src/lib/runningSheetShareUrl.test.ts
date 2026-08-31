import { describe, expect, it } from 'vitest';
import { buildRunningSheetUrl } from './urlUtils';

describe('buildRunningSheetUrl', () => {
  it('keeps development share links on the current app origin and safely encodes route parts', () => {
    expect(buildRunningSheetUrl('token/with+unsafe=', 'Andy & Cathy')).toBe(
      `${window.location.origin}/shared-running-sheet/Andy%20%26%20Cathy/token%2Fwith%2Bunsafe%3D`,
    );
  });
});
