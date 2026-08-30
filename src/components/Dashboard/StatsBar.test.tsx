import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatsBar } from './StatsBar';

const stats = {
  tablesCreated: 10,
  seatsCreated: 100,
  seatsFilled: 78,
  seatsRemaining: 22,
  eventGuestLimit: 100,
  tablesAtCapacity: 3,
  sentInvites: 8,
  unsentInvites: 70,
  respondedInvites: 34,
  unrespondedInvites: 3,
};

describe('Guest List and Tables statistics overview', () => {
  it('adds the approved overview copy without changing any KPI labels or values', () => {
    render(<StatsBar stats={stats} />);

    expect(screen.getByRole('heading', { name: 'Guest & RSVP Overview', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(
      'Monitor guest capacity, tables, seating and invitation activity at a glance, so you can stay up to date and in control of your planning.',
    )).toBeInTheDocument();

    const expectedStats = [
      ['Guest Limit', '100'],
      ['Tables Created', '10'],
      ['Seats Created', '100'],
      ['Seats Filled', '78'],
      ['Seats Remaining', '22'],
      ['Full Tables', '3'],
      ['Sent Invites', '8'],
      ['Unsent Invites', '70'],
      ['Replied Invites', '34'],
      ['Unreplied Invites', '3'],
    ];

    expectedStats.forEach(([label, value]) => {
      // The component deliberately renders a mobile and a tablet/desktop KPI grid.
      expect(screen.getAllByText(label)).toHaveLength(2);
      expect(screen.getAllByText(value).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('keeps the existing responsive KPI grids so desktop stays in one row and smaller screens wrap', () => {
    const { container } = render(<StatsBar stats={stats} />);

    expect(container.querySelector('.sm\\:hidden')).toBeInTheDocument();
    expect(container.querySelector('.xl\\:grid-cols-10')).toBeInTheDocument();
    expect(container.querySelector('.md\\:grid-cols-3')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:grid-cols-5')).toBeInTheDocument();
  });

  it('uses the shared overview colour treatment on both pages', () => {
    const { container } = render(<StatsBar stats={stats} />);
    const heading = screen.getByRole('heading', { name: 'Guest & RSVP Overview', level: 2 });
    const subtitle = screen.getByText(
      'Monitor guest capacity, tables, seating and invitation activity at a glance, so you can stay up to date and in control of your planning.',
    );
    const icon = container.querySelector('svg[aria-hidden="true"]');

    expect(heading.className).toContain('overviewHeading');
    expect(subtitle.className).toContain('overviewSubtitle');
    expect(icon?.getAttribute('class')).toContain('overviewIcon');
    expect(heading.closest('[data-stats-overview]')).toHaveClass('ww-stats-overview');
  });

  it('keeps legacy KPI colour rules from overriding the overview paragraph and SVG', () => {
    const globalCss = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    const moduleCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/StatsBar.module.css'), 'utf8');

    expect(globalCss).not.toContain('.ww-tables-stats :is(p, svg, .text-primary)');
    expect(globalCss).toContain('.ww-tables-stats :is(.ww-stat-label, .ww-stat-value, .ww-stat-icon, .text-primary)');
    expect(globalCss).toContain('.ww-stats-overview *');
    expect(moduleCss).toContain('color: #d9b77f;');
    expect(moduleCss).toContain('color: rgba(255, 255, 255, 0.8);');
  });
});
