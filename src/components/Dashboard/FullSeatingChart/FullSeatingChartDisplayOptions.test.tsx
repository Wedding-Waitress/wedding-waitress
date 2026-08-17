import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FullSeatingChartCustomizer } from './FullSeatingChartCustomizer';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import type { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';

const settings: FullSeatingChartSettings = {
  sortBy: 'firstName', fontSize: 'small', showDietary: true, showGuestNames: true,
  showSeatNumbers: true, showGuestList: true, showRsvp: false, showRelation: true,
  guestNameColor: '#C62828', seatNumberColor: '#1565C0', guestListColor: '#2E7D32',
  dietaryColor: '#967A59', relationshipColor: '#7E57C2', showLogo: true,
  paperSize: 'A4', isBold: true, isItalic: false, isUnderline: false,
};

const guest = {
  id: 'guest-1', first_name: 'Alex', last_name: 'Taylor', table_id: null, table_no: 3,
  dietary: 'gluten free', relation_display: 'bride / cousin', relation_role: null,
};

const event = {
  id: 'event-1', name: 'Alex & Sam', date: '2026-08-12', venue: 'Venue',
  start_time: '18:00', finish_time: '23:00',
};

describe('Full Seating Chart display controls', () => {
  it('uses black defaults while allowing only the selected field colours to override them', () => {
    const blackSettings = {
      ...settings,
      guestNameColor: '#000000', seatNumberColor: '#000000', guestListColor: '#000000',
      dietaryColor: '#000000', relationshipColor: '#000000',
    } as FullSeatingChartSettings;
    const { container, rerender } = render(
      <FullSeatingChartPreview event={event} guests={[guest] as any} settings={blackSettings} />,
    );

    expect(container.querySelector('[data-a4-preview-page="true"]')).toHaveStyle({ color: '#000000' });
    expect(container.querySelector('[data-guest-name-text="true"]')).toHaveStyle({ color: '#000000' });
    expect(container.querySelector('[data-seat-assignment-text="true"]')).toHaveStyle({ color: '#000000' });
    expect(container.querySelector('[data-dietary-text="true"]')).toHaveStyle({ color: '#000000' });
    expect(container.querySelector('[data-relationship-text="true"]')).toHaveStyle({ color: '#000000' });
    expect(container.querySelector('svg circle')).toHaveAttribute('stroke', '#000000');

    fireEvent.click(container.querySelector('[data-full-seating-guest-row="true"]')!);
    expect(container.querySelector('svg circle')).toHaveAttribute('stroke', '#000000');
    expect(container.querySelector('svg path')).toHaveAttribute('stroke', '#000000');

    rerender(<FullSeatingChartPreview event={event} guests={[guest] as any} settings={settings} />);
    expect(container.querySelector('[data-guest-name-text="true"]')).toHaveStyle({ color: '#C62828' });
    expect(container.querySelector('svg circle')).toHaveAttribute('stroke', '#000000');
    expect(container.querySelector('img[alt="Wedding Waitress"]')).toHaveAttribute('src', '/wedding-waitress-logo-brown.png?v=2');
  });

  it('renders five ordered rows with seven independent colour choices and toggles', () => {
    const onSettingsChange = vi.fn();
    render(<FullSeatingChartCustomizer settings={settings} onSettingsChange={onSettingsChange} />);

    const labels = [
      'Show Guest Names', 'Show Seat Numbers', 'Show Guest List',
      'Show Dietary Requirements', 'Show Relationship',
    ];
    const positions = labels.map(label => document.body.textContent!.indexOf(label));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(screen.getAllByRole('switch')).toHaveLength(5);

    const groups = [
      ['guest names', 'guestNameColor'], ['seat numbers', 'seatNumberColor'],
      ['guest list', 'guestListColor'], ['dietary requirements', 'dietaryColor'],
      ['relationships', 'relationshipColor'],
    ] as const;
    groups.forEach(([name, settingName]) => {
      expect(screen.getByRole('group', { name: `${name} colour` }).querySelectorAll('button')).toHaveLength(7);
      fireEvent.click(screen.getByRole('button', { name: `Use orange for ${name}` }));
      expect(onSettingsChange).toHaveBeenCalledWith({ [settingName]: '#E67E22' });
    });

    const toggleSettings = ['showGuestNames', 'showSeatNumbers', 'showGuestList', 'showDietary', 'showRelation'];
    screen.getAllByRole('switch').forEach((toggle, index) => {
      fireEvent.click(toggle);
      expect(onSettingsChange).toHaveBeenCalledWith({ [toggleSettings[index]]: false });
    });
  });

  it('synchronises visibility and independent colours with the live A4 preview', () => {
    const { container, rerender } = render(
      <FullSeatingChartPreview event={event} guests={[guest] as any} settings={settings} />,
    );
    expect(container.querySelector('[data-guest-name-text="true"]')).toHaveStyle({ color: '#C62828' });
    expect(container.querySelector('[data-seat-assignment-text="true"]')).toHaveStyle({ color: '#1565C0' });
    expect(container.querySelector('[data-dietary-text="true"]')).toHaveStyle({ color: '#967A59' });
    expect(container.querySelector('[data-relationship-text="true"]')).toHaveStyle({ color: '#7E57C2' });

    rerender(<FullSeatingChartPreview event={event} guests={[guest] as any} settings={{ ...settings, showGuestNames: false }} />);
    expect(container.querySelector('[data-guest-name-text="true"]')).toBeNull();
    expect(container.querySelector('svg circle')).toBeInTheDocument();

    rerender(<FullSeatingChartPreview event={event} guests={[guest] as any} settings={{ ...settings, showSeatNumbers: false }} />);
    expect(container.querySelector('[data-seat-assignment-text="true"]')).toBeNull();
    expect(screen.getAllByText('Table').length).toBeGreaterThan(0);

    rerender(<FullSeatingChartPreview event={event} guests={[guest] as any} settings={{ ...settings, showGuestList: false }} />);
    expect(container.querySelector('[data-guest-name-text="true"]')).toBeNull();
    expect(screen.getAllByText('Alex & Sam').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Table').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Wedding Waitress').length).toBeGreaterThan(0);
  });
});
