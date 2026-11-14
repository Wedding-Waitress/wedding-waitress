import { describe, expect, it } from 'vitest';
import { publicSharedAccessibilityRows, publicSharedAccessibilitySources } from './publicSharedAccessibilityCopy';
describe('public accessibility translation identity',()=>{
 it.each(Object.keys(publicSharedAccessibilityRows))('%s keeps sound controls separate from social links',language=>{
  const values=publicSharedAccessibilityRows[language];
  expect(values).toHaveLength(publicSharedAccessibilitySources.length);
  for(const platform of ['Instagram','Facebook','YouTube']) {
   expect(values[publicSharedAccessibilitySources.indexOf(('Wedding Waitress on '+platform) as typeof publicSharedAccessibilitySources[number])]).toContain(platform);
  }
  for(const source of ['Turn sound on','Mute sound'])expect(values[publicSharedAccessibilitySources.indexOf(source as typeof publicSharedAccessibilitySources[number])]).not.toMatch(/Instagram|Facebook|YouTube/);
 });
});
