import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MyEventsHeroLayout } from './MyEventsHeroLayout';

const renderLayout = (hasCeremony: boolean, hasReception: boolean) => render(
  <MyEventsHeroLayout
    hasCeremony={hasCeremony}
    hasReception={hasReception}
    ceremony={<section>Ceremony card</section>}
    countdown={<section>Countdown section</section>}
    reception={<section>Reception card</section>}
  />,
);

describe('MyEventsHeroLayout', () => {
  it.each([
    { ceremony: true, reception: true, layout: 'both', order: ['Ceremony card', 'Countdown section', 'Reception card'] },
    { ceremony: true, reception: false, layout: 'ceremony-only', order: ['Ceremony card', 'Countdown section'] },
    { ceremony: false, reception: true, layout: 'reception-only', order: ['Countdown section', 'Reception card'] },
    { ceremony: false, reception: false, layout: 'countdown-only', order: ['Countdown section'] },
  ])('renders only the available sections in $layout order', ({ ceremony, reception, layout, order }) => {
    const { container } = renderLayout(ceremony, reception);
    const hero = container.firstElementChild;

    expect(hero).toHaveAttribute('data-layout', layout);
    if (ceremony) expect(screen.getByText('Ceremony card')).toBeInTheDocument();
    else expect(screen.queryByText('Ceremony card')).not.toBeInTheDocument();
    if (reception) expect(screen.getByText('Reception card')).toBeInTheDocument();
    else expect(screen.queryByText('Reception card')).not.toBeInTheDocument();
    expect(Array.from(hero?.querySelectorAll('section') ?? []).map(section => section.textContent)).toEqual(order);
  });

  it('keeps compact circles and responsive one, two and three-column layouts overflow-safe', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/Dashboard/MyEventsPage.module.css'), 'utf8');

    expect(css).toMatch(/\.heroLayout[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.countdownCircles[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 5rem\)\)/);
    expect(css).toMatch(/@container \(min-width: 47rem\)[\s\S]*ceremony-only[\s\S]*reception-only/);
    expect(css).toMatch(/@container \(min-width: 67rem\)[\s\S]*data-layout='both'/);
    expect(css).toMatch(/--event-detail-card-width:\s*clamp\(17\.5rem,[\s\S]*32\.5rem\)/);
    expect(css).toMatch(/data-layout='both'[\s\S]*grid-template-columns:\s*var\(--event-detail-card-width\)[\s\S]*var\(--event-detail-card-width\)/);
    expect(css).toMatch(/\.ceremonySlot,[\s\S]*\.receptionSlot[\s\S]*width:\s*min\(100%, var\(--event-detail-card-width\)\)/);
    expect(css).toMatch(/\.detailCard[\s\S]*min-width:\s*0/);
  });
});
