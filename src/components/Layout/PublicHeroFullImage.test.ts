import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync('src/styles/PublicSite.css', 'utf8'));
describe('full non-homepage hero framing', () => {
  it('removes cropping and zoom only inside the phone/tablet media query', () => {
    let found = false;
    css.walkRules('.ww-public-photo-hero > .ww-public-hero-picture img', rule => {
      const declarations = Object.fromEntries(rule.nodes.filter(n => n.type === 'decl').map(n => [n.prop,n.value]));
      if(declarations['object-fit']!=='contain')return;
      found=true;
      expect(rule.parent.type).toBe('atrule');
      expect((rule.parent as postcss.AtRule).params).toBe('(max-width: 1023px)');
      expect(declarations.animation).toBe('none');
      expect(declarations.transform).toBe('none');
    });
    expect(found).toBe(true);
  });
  it('lets the original image set its height and places hero copy after it', () => {
    let flow=false,content=false;
    css.walkRules(rule=>{
      if(rule.selector.includes('.ww-public-photo-hero > .ww-public-hero-picture,') && rule.nodes.some(n=>n.type==='decl'&&n.prop==='height'&&n.value==='auto'))flow=true;
      if(rule.selector==='.ww-public-photo-hero > .ww-public-hero-content')content=true;
    });
    expect(flow).toBe(true);expect(content).toBe(true);
    expect(readFileSync('src/pages/VenueDetail.tsx','utf8')).toContain('ww-venue-detail-photo');
  });
});
