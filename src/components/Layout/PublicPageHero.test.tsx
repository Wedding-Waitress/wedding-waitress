import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import { PublicPageHero } from './PublicPageHero';

describe('PublicPageHero', () => {
  it('renders one clear heading and decorative responsive photography', () => {
    const { container } = render(
      <PublicPageHero
        asset={publicHeroForRoute('/products')}
        eyebrow="Products"
        title="Connected planning tools"
        description="Plan the whole celebration in one place."
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Connected planning tools' })).toBeInTheDocument();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('picture source[type="image/avif"]')).toBeInTheDocument();
    expect(container.querySelector('picture source[type="image/webp"]')).toBeInTheDocument();
    expect(container.querySelector('picture img')).toHaveAttribute('alt', '');
  });

  it('removes word-joining hyphens from the visible H1 only', () => {
    render(
      <PublicPageHero
        asset={publicHeroForRoute('/blog/:slug')}
        eyebrow="Planning journal"
        title="All-in-one guest‑experience step–by–step guide"
        description="The supporting copy remains unchanged-in-context."
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'All in one guest experience step by step guide',
    );
    expect(screen.getByText('The supporting copy remains unchanged-in-context.')).toBeInTheDocument();
  });
});
