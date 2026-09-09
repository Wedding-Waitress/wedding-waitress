import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/components/Account/TeamAccessDialog.module.css', 'utf8');

describe('Team & Access roster visual contract', () => {
  it('uses the approved espresso header, white labels and four-field row geometry', () => {
    expect(css.match(/linear-gradient\(180deg,\s*#5d392d,\s*#351d17\)/g)).toHaveLength(2);
    expect(css).toMatch(/color:\s*#fffaf3/);
    expect(css).toMatch(/grid-template-columns:\s*1\.15fr 1\.45fr 1fr 1\.25fr/);
    expect(css).toMatch(/gap:\s*8px/);
    expect(css).toContain('.personRow > [role="cell"]');
    expect(css).toMatch(/min-height:\s*2\.65rem/);
  });
});
