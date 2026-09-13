import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/components/Account/TeamAccessDialog.module.css', 'utf8');

describe('Team & Access roster visual contract', () => {
  it('uses the approved dashboard table palette and four-field row geometry', () => {
    expect(css).toMatch(/background:\s*#eadbc8/);
    expect(css).toMatch(/background:\s*#fbf8f2/);
    expect(css).toMatch(/color:\s*#2b1711/);
    expect(css).toMatch(/border:\s*1px solid #cdb99e/);
    expect(css).toMatch(/grid-template-columns:\s*1\.15fr 1\.45fr 1fr 1\.25fr/);
    expect(css).toMatch(/gap:\s*8px/);
    expect(css).toContain('.personRow > [role="cell"]');
    expect(css).toMatch(/min-height:\s*2\.65rem/);
  });
});
