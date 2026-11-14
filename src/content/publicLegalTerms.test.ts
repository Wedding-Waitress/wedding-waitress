import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicLegalTermsRows, publicLegalTermsSources } from '@/i18n/publicLegalTermsCopy';

const source = readFileSync('src/pages/TermsOfService.tsx','utf8');
describe('approved Terms and consumer rights', () => {
  it('provides every changed legal paragraph in all public languages', () => {
    expect(Object.keys(publicLegalTermsRows).sort()).toEqual(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'].sort());
    for(const [language,rows] of Object.entries(publicLegalTermsRows)) {
      expect(rows).toHaveLength(publicLegalTermsSources.length);
      expect(rows.every(text=>typeof text==='string'&&text.trim().length>0)).toBe(true);
      if(language!=='en')rows.forEach((text,index)=>expect(text).not.toEqual(publicLegalTermsSources[index]));
    }
  });
  it('replaces blanket exclusions and the unverified backup promise while preserving plan terms', () => {
    for(const text of ['While we implement regular backups','We are not liable for data loss.','WITHOUT WARRANTIES OF ANY KIND','Data Loss & Platform Use Disclaimer','Use of the platform is at your own risk.','Our total liability to you for any claims'])expect(source).not.toContain(text);
    for(const index of [1,3,4,6,7,8,9,10,11,12,13])expect(source).toContain(JSON.stringify(publicLegalTermsSources[index]));
    expect(source).toContain('gstInclusiveAud(plan.priceAud).toFixed(2)');
    expect(source).toContain('Last updated: 22 October 2026');
  });
  it('preserves section anchors and aligns the availability table-of-contents label', () => {
    const anchors=new Set([...source.matchAll(/<section id="([^"]+)"/g)].map(m=>m[1]));
    for(const match of source.matchAll(/href="#([^"]+)"/g))expect(anchors.has(match[1])).toBe(true);
    expect(source.match(/11\. Service availability and data risks/g)).toHaveLength(2);
    expect(source).toContain('mailto:support@weddingwaitress.com.au');
  });
});
