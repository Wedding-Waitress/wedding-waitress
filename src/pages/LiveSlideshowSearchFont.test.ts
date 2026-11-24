import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const reference=fs.readFileSync('src/pages/GuestLookup.module.css','utf8');
const slideshow=fs.readFileSync('src/pages/LiveSlideshowView.module.css','utf8');
describe('approved entered-name sizing',()=>{
 it('keeps the larger QR search and existing slideshow search sizes',()=>{
 const size=reference.match(/\.page input\[data-guest-name-search\]\s*\{\s*font-size:\s*(\d+px)\s*!important/)![1];
 expect(size).toBe('24px');
 expect(slideshow.match(/\.page input\.nameSearch\s*\{\s*font-size:\s*(\d+px) !important/)![1]).toBe('20px');
 expect(slideshow.match(/input\.nameSearch\s*\{[^}]*font-size/g)).toHaveLength(1);
 });
});
