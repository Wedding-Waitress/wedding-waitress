import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/GuestListTable.tsx'), 'utf8');

describe('Guest List setup controls', () => {
  it('does not render zero-width placeholder buttons as focusable controls', () => {
    expect(source).not.toMatch(/<button[^>]*>\s*\u200b\s*<\/button>/u);
  });

  it('uses one mutually exclusive centre state and removes the old information-card row', () => {
    expect(source).toContain("type GuestListCentre = 'communications' | 'delivery' | 'intelligence' | 'sms' | 'guest-live-view' | null;");
    expect(source).toContain('const [activeCentre, setActiveCentre]');
    expect(source).not.toContain('styles.infoCardsRow');
    expect(source).not.toContain('<SmartSmsCreditStatus');
    expect(source).not.toContain('Guest Live View APP Protection. You have full control');
  });
});
