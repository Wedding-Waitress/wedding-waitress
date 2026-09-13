import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicFooter } from './PublicFooter';

const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');
const landing = readFileSync('src/pages/Landing.tsx', 'utf8');

describe('public footer navigation', () => {
  it('keeps the footer description free of hyphens', () => {
    render(createElement(MemoryRouter, null, createElement(PublicFooter)));
    expect(screen.getByText('An all in one wedding planning and guest experience platform for guests, RSVPs, seating, stationery, event day details and shared memories.')).toBeInTheDocument();
  });
  it('uses the approved Plan & Organise order and budget planner route', () => {
    const products = readFileSync('src/content/publicProducts.ts', 'utf8');
    const ids = ['my-events', 'event-budget-planner', 'tables', 'guest-list', 'floor-plan'];

    ids.slice(1).forEach((id, index) => {
      expect(products.indexOf(`id: '${id}'`)).toBeGreaterThan(products.indexOf(`id: '${ids[index]}'`));
    });
    expect(products).toContain("shortName: 'Floor Plans'");
    expect(products).toContain("path: '/event-budget-planner'");
  });

  it('keeps only legal links at the bottom and moves the other links above', () => {
    render(createElement(MemoryRouter, null, createElement(PublicFooter)));
    const bottom = screen.getByRole('navigation', { name: 'Footer' });
    expect(within(bottom).getAllByRole('link').map(link => link.textContent)).toEqual(['Privacy Policy', 'Terms and Conditions', 'Cookie Policy']);
    for (const label of ['How It Works', 'Pricing', 'Blog', 'FAQ', 'Contact', 'Sign In']) {
      const link = screen.getByRole('link', { name: label });
      expect(bottom).not.toContainElement(link);
      expect(link).toHaveClass('hover:font-semibold', 'hover:text-white');
    }
    expect(within(bottom).queryByRole('link', { name: 'Event Types' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event Types' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
    const planning = screen.getByRole('heading', { name: 'Event Day Planning' }).parentElement!;
    expect(within(planning).getAllByRole('link').slice(-3).map(link => link.textContent)).toEqual(['Contact', 'Pricing', 'Sign In']);
    expect(within(planning).getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('heading', { name: 'Event-Day Planning' })).not.toBeInTheDocument();
  });

  it('orders copyright, linked powered-by credit and policy links with separators', () => {
    render(createElement(MemoryRouter, null, createElement(PublicFooter, { showBackToTop: true })));
    const credit = screen.getByRole('link', { name: 'Marketing King Australia' });
    expect(credit).toHaveAttribute('href', 'https://marketingking.com.au/');
    const flag = screen.getByRole('img', { name: 'Australian flag' });
    expect(flag).toHaveAttribute('src', '/flags/australian-flag.jpg');
    expect(flag).toHaveAttribute('width', '32');
    expect(flag).toHaveAttribute('height', '20');
    expect(flag).toHaveClass('h-auto', 'object-contain', '-rotate-12', '-translate-y-0.5');
    expect(flag.parentElement).toHaveTextContent(`Copyright © ${new Date().getFullYear()} Wedding Waitress`);
    expect(credit.nextElementSibling).toBeNull();
    expect(flag.parentElement!.nextElementSibling).toHaveTextContent('|');
    const row = credit.closest('footer')!.lastElementChild!.lastElementChild!;
    expect(row.textContent).toBe(`Copyright © ${new Date().getFullYear()} Wedding Waitress|Powered by: Marketing King Australia|Privacy Policy|Terms and Conditions|Cookie Policy`);
    expect(row.lastElementChild).toBe(screen.getByRole('button', { name: 'Back to top' }));
  });

  it('uses identical text sizing and style for upper and lower footer links', () => {
    render(createElement(MemoryRouter, null, createElement(PublicFooter)));
    const reference = screen.getByRole('link', { name: 'How It Works' });
    for (const label of ['My Events', 'Pricing', 'Marketing King Australia', 'Privacy Policy', 'Terms and Conditions', 'Cookie Policy']) {
      expect(screen.getByRole('link', { name: label }).className).toBe(reference.className);
    }
    expect(reference).toHaveClass('text-sm', 'font-normal', 'text-white/65');
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
