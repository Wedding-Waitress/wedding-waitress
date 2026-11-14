import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const reference=fs.readFileSync('src/pages/GuestLookup.module.css','utf8');
const slideshow=fs.readFileSync('src/pages/LiveSlideshowView.module.css','utf8');
describe('matching entered-name sizing',()=>{
 it('uses the reference input?s explicit font-size override without responsive size changes',()=>{
 const size=reference.match(/\.page input\[data-guest-name-search\]\s*\{\s*font-size:\s*(\d+px) !important/)![1];
 expect(size).toBe('20px');
 expect(slideshow.match(/\.page input\.nameSearch\s*\{\s*font-size:\s*(\d+px) !important/)![1]).toBe(size);
 expect(slideshow.match(/input\.nameSearch\s*\{[^}]*font-size/g)).toHaveLength(1);
 });
});
