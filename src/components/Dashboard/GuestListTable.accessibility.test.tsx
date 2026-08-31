import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/GuestListTable.tsx'), 'utf8');

describe('Guest List setup controls', () => {
  it('does not render zero-width placeholder buttons as focusable controls', () => {
    expect(source).not.toMatch(/<button[^>]*>\s*\u200b\s*<\/button>/u);
  });
});
