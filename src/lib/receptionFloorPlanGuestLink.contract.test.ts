import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('guest reception floor plan linking contract', () => {
  it('links an enabled existing plan by its bearer share token', () => {
    const source = read('src/components/Dashboard/QRCode/QRCodeMainCard.tsx');

    expect(source).toContain(".select('share_enabled, share_token')");
    expect(source).toContain('if (!data.share_enabled || !data.share_token)');
    expect(source).toContain('share_token: data.share_token');
    expect(source).not.toContain('Coming soon — Reception floor plan configuration is not yet available.');
  });

  it('renders the existing plan through the token-gated public share hook', () => {
    const guestLookup = read('src/pages/GuestLookup.tsx');
    const readOnlyView = read('src/components/GuestView/ReadOnlyReceptionFloorPlan.tsx');

    expect(guestLookup).toContain('<ReadOnlyReceptionFloorPlan');
    expect(guestLookup).toContain('reception_floor_plan_config.share_token');
    expect(readOnlyView).toContain('useReceptionFloorPlanShare(token || undefined)');
    expect(readOnlyView).toContain('readOnly');
  });
});
