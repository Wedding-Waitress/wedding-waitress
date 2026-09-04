import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicProducts } from '@/content/publicProducts';
import { publicEventTypes } from '@/content/publicEventTypes';
import { normalisePublicHeroHeading } from './PublicPageHero';

const WORD_JOINING_HYPHEN = /\p{L}[-‑–]\p{L}/u;
const homepageHeroSource = readFileSync('src/components/Layout/PublicCinematicHero.tsx', 'utf8');

const staticPageHeroHeadings = [
  'Six stages from first plan to wedding day',
  'Sixteen tools. One connected wedding plan.',
  'Thoughtful tools for every kind of gathering',
  'Choose by guest capacity, not by features',
  'Answers before you start planning',
  'How can we help?',
  'Wedding Tips & Ideas',
  'Privacy Policy',
  'Terms of Service',
  'Cookie Policy',
  'Wedding & Event Venue Floor Plans',
];

const translatedBlogHeroHeadings = readdirSync('src/i18n/locales', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const locale = JSON.parse(
      readFileSync(`src/i18n/locales/${entry.name}/landing.json`, 'utf8'),
    ) as {
      blog?: { title?: string; posts?: Record<string, { title?: string }> };
    };
    return [
      locale.blog?.title,
      ...Object.values(locale.blog?.posts ?? {}).map((post) => post.title),
    ].filter((heading): heading is string => Boolean(heading));
  });

describe('public hero H1 copy contract', () => {
  it('keeps the homepage H1 free of word-joining hyphens', () => {
    const homepageHeading = homepageHeroSource.match(
      /<h1 className="ww-display max-w-4xl">([^<]+)<\/h1>/,
    )?.[1];

    expect(homepageHeading).toBe('Your all in one wedding planning and guest experience platform');
    expect(homepageHeading).not.toMatch(WORD_JOINING_HYPHEN);
  });

  it('covers configured product, event, static and translated blog hero headings', () => {
    const configuredHeadings = [
      ...staticPageHeroHeadings,
      ...publicProducts.map((product) => product.h1),
      ...publicEventTypes.map((eventType) => eventType.h1),
      ...translatedBlogHeroHeadings,
    ];

    expect(publicProducts).toHaveLength(16);
    expect(publicEventTypes).toHaveLength(6);
    expect(staticPageHeroHeadings).toHaveLength(11);
    expect(translatedBlogHeroHeadings.length).toBeGreaterThanOrEqual(11);

    for (const heading of configuredHeadings) {
      expect(normalisePublicHeroHeading(heading), heading).not.toMatch(WORD_JOINING_HYPHEN);
    }
  });

  it('removes standard, nonbreaking and en-dash word joiners without changing spaced punctuation', () => {
    expect(normalisePublicHeroHeading('all-in-one guest‑experience step–by–step')).toBe(
      'all in one guest experience step by step',
    );
    expect(normalisePublicHeroHeading('Planning – one connected place')).toBe(
      'Planning – one connected place',
    );
  });

  it('uses natural copy where a direct replacement would break grammar', () => {
    expect(normalisePublicHeroHeading(
      'Les plans de table numériques sont-ils faciles pour les invités âgés ? (Guide de mariage)',
    )).toBe(
      'Plans de table numériques faciles pour les invités âgés : guide de mariage',
    );
    expect(normalisePublicHeroHeading(
      'So bewältigen Sie Last-Minute-Sitzplatzänderungen ohne Stress',
    )).toBe('So bewältigen Sie kurzfristige Sitzplatzänderungen ohne Stress');
  });
});
