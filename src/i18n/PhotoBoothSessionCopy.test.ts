import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
it('provides Photo Booth failure/retry copy in every header language, with accurate save-count placeholders',()=>{
 const header=readFileSync('src/components/Layout/Header.tsx','utf8');
 const languages=[...new Set([...header.matchAll(/code:\s*'([a-z]{2})'/g)].map(match=>match[1]))];
 expect(languages).toHaveLength(13);
 const en=JSON.parse(readFileSync('src/i18n/locales/en/common.json','utf8')).photoBoothSession;
 for(const lang of languages){
  const copy=JSON.parse(readFileSync(`src/i18n/locales/${lang}/common.json`,'utf8')).photoBoothSession;
  for(const key of ['partial','captureFailed','nameLabel','namePlaceholder','captureNote','capturedPhoto']){
   expect(copy[key],`${lang}.${key}`).toBeTruthy();expect(copy[key]).not.toMatch(/[?\uFFFD]/);
   if(lang!=='en')expect(copy[key]).not.toBe(en[key]);
  }
  expect(copy.captureNote).toContain('4'); expect(copy.captureNote).toContain('8');
  expect(copy.capturedPhoto).toContain('{{number}}');
  expect(copy.partial).toContain('{{saved}}');expect(copy.partial).toContain('{{total}}');
 }
});
