import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { publicGuestSearchSources, publicGuestSearchRows } from './publicGuestSearchCopy';
it('covers every supported header language with complete guest search and sharing guidance',()=>{
 const header=readFileSync('src/components/Layout/Header.tsx','utf8');
 const languages=[...new Set([...header.matchAll(/code:\s*'([a-z]{2})'/g)].map(match=>match[1]))];
 expect(Object.keys(publicGuestSearchRows).sort()).toEqual(languages.sort());
 expect(publicGuestSearchRows.en).toEqual(publicGuestSearchSources);
 for(const row of Object.values(publicGuestSearchRows)) {
  expect(row).toHaveLength(publicGuestSearchSources.length);
  expect(row[1]).toContain('3');
  for(const text of row) expect(text.trim()).not.toBe('');
 }
});
