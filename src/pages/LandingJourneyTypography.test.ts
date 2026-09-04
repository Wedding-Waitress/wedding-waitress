import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');

describe('homepage journey card description typography', () => {
  it('targets only the five descriptions in the homepage journey list', () => {
    expect(landing).toContain('From first event detail to final song');
    expect(landing).toContain('className="ww-home-journey');
    expect(landing.match(/<p className="text-sm leading-6 text-\[#6f625b\]">\{text\}<\/p>/g)).toHaveLength(5);
    expect(publicSiteCss).toMatch(
      /\.ww-home-journey\s*>\s*li\s*>\s*div:last-child\s*>\s*p\s*\{\s*font-size:\s*14px;\s*font-weight:\s*500;\s*line-height:\s*24px;\s*\}/,
    );
  });
});
