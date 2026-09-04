import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const deliveryAssets = ['desktop', 'tablet', 'mobile'].flatMap((size) =>
  ['avif', 'webp', 'jpg'].map((format) =>
    `public/images/public-sections/homepage-real-experience-${size}.${format}`,
  ),
);

describe('homepage real experience section', () => {
  it('replaces the repeated product highlights with the supplied trust copy', () => {
    expect(landing).not.toContain('Connected planning feels calmer');
    expect(landing).not.toContain('Platform highlights');
    expect(landing).not.toContain('Explore this product');
    expect(landing).not.toContain('const highlights');
    expect(landing).toContain('Real experience behind every detail');
    expect(landing).toContain('Built from real wedding experience');
    expect(landing).toContain('more than 31 years in the wedding industry and over 6,500 weddings and events behind them');
    expect(landing).toContain('Created by Australian wedding professionals');
    expect(landing).toContain('Shaped by more than 6,500 weddings and events');
    expect(landing).toContain('Designed to make planning simpler and celebrations smoother');
  });

  it('retains the surrounding homepage order and existing signup destination', () => {
    const events = landing.indexOf('<HomepageEventTypes />');
    const experience = landing.indexOf('homepage-experience-title');
    const faq = landing.indexOf('A few things couples ask first');

    expect(events).toBeGreaterThan(-1);
    expect(experience).toBeGreaterThan(events);
    expect(faq).toBeGreaterThan(experience);
    expect(landing).toContain('to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus ww-home-experience-cta"');
  });

  it('delivers responsive optimized image sources with intrinsic dimensions', () => {
    expect(landing).toContain('width="1536" height="1024"');
    expect(landing).toContain('alt="Experienced wedding professional helping a couple review reception details at their venue"');
    for (const asset of deliveryAssets) {
      expect(existsSync(asset), asset).toBe(true);
      expect(statSync(asset).size, asset).toBeGreaterThan(20_000);
    }
    expect(existsSync('src/assets/public-sections/masters/homepage-real-experience.png')).toBe(true);
  });

  it('uses a 55–60% desktop image column and stacks image-first on tablet and mobile', () => {
    expect(publicSiteCss).toMatch(
      /\.ww-home-experience-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1\.45fr\) minmax\(20rem, 1fr\)/,
    );
    expect(publicSiteCss).toMatch(
      /@media \(max-width:\s*1023px\)[\s\S]*\.ww-home-experience-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/,
    );
    expect(publicSiteCss).toMatch(/\.ww-home-experience-media img\s*\{[\s\S]*object-fit:\s*cover/);
    expect(landing).toContain('className="ww-section ww-section-espresso ww-home-experience"');
    expect(publicSiteCss).not.toMatch(/\.ww-home-experience\s*\{[^}]*background(?:-image)?\s*:/);
  });
});
