import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicFooter } from './PublicFooter';

const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');
const landing = readFileSync('src/pages/Landing.tsx', 'utf8');

describe('public footer navigation', () => {
  it('uses the approved Plan & Organise order and budget planner route', () => {
    const products = readFileSync('src/content/publicProducts.ts', 'utf8');
    const ids = ['my-events', 'event-budget-planner', 'tables', 'guest-list', 'floor-plan'];

    ids.slice(1).forEach((id, index) => {
      expect(products.indexOf(`id: '${id}'`)).toBeGreaterThan(products.indexOf(`id: '${ids[index]}'`));
    });
    expect(products).toContain("shortName: 'Floor Plans'");
    expect(products).toContain("path: '/event-budget-planner'");
  });

  it('gives all eleven bottom navigation links a brighter and bolder hover state', () => {
    expect(footer.match(/className="hover:font-semibold hover:text-white"/g)).toHaveLength(11);
  });

  it('keeps the homepage back-to-top control beside copyright and scrolls to the top', () => {
    expect(landing).toContain('<PublicFooter showBackToTop />');
    expect(footer).toContain('aria-label="Back to top"');
    expect(footer).not.toContain('mt-8 flex justify-end');

    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(createElement(MemoryRouter, null, createElement(PublicFooter, { showBackToTop: true })));
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    scrollToSpy.mockRestore();
  });
});
